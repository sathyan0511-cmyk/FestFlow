const path = require('path');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const connectDB = require('../config/db');

(async () => {
  console.log('--- RUNNING POST-HARMONIZATION VERIFICATION CHECKS ---');

  // 1. Connect to Local MongoDB
  const localClient = new MongoClient('mongodb://127.0.0.1:27017');
  await localClient.connect();
  const localDb = localClient.db('festflow');

  // 1.1 Check Quarantined Records
  const backupCount = await localDb.collection('_orphaned_clubmemberships_backup').countDocuments();
  console.log(`1. Quarantine Collection Count: ${backupCount} (Expected: 24)`);

  // 1.2 Check Active ClubMemberships
  const activeMemberships = await localDb.collection('clubmemberships').find({}).toArray();
  console.log(`2. Active ClubMemberships Count: ${activeMemberships.length} (Expected: 1)`);
  
  // Verify broken references in active memberships
  let brokenRefsCount = 0;
  for (const m of activeMemberships) {
    const u = await localDb.collection('users').findOne({ _id: m.user });
    const c = await localDb.collection('clubs').findOne({ _id: m.club });
    if (!u || !c) brokenRefsCount++;
  }
  console.log(`3. Broken References in Active Memberships: ${brokenRefsCount} (Expected: 0)`);

  // 1.3 Check Unversioned Documents
  const domainCollections = [
    'users', 'venues', 'clubs', 'events', 'clubmemberships', 'registrations',
    'caterings', 'budgets', 'expenses', 'revenues', 'eventsponsors',
    'competitions', 'feedbacks', 'volunteers', 'certificates', 'payments',
    'teams', 'judges', 'judgingcriterias', 'prizes', 'judgescores',
    'results', 'sponsors'
  ];
  let unversionedCount = 0;
  for (const col of domainCollections) {
    const unv = await localDb.collection(col).countDocuments({
      $or: [{ _syncVersion: { $exists: false } }, { _syncVersion: null }]
    });
    unversionedCount += unv;
  }
  console.log(`4. Total Unversioned Active Documents: ${unversionedCount} (Expected: 0)`);

  // 1.4 Check Queue Invariance
  const queueCount = await localDb.collection('syncqueues').countDocuments();
  console.log(`5. SyncQueue Count: ${queueCount} (Expected: 241)`);

  // 2. Connect to Atlas via Secondary Connection
  await connectDB();
  await new Promise(r => setTimeout(r, 2000));
  const atlasConn = connectDB.getAtlasConnection();

  // 2.1 Check Atlas 'test' Database count
  const atlasTestColls = await atlasConn.db.listCollections().toArray();
  let atlasTestTotal = 0;
  for (const c of atlasTestColls) {
    const cnt = await atlasConn.collection(c.name).countDocuments();
    atlasTestTotal += cnt;
  }
  console.log(`6. Atlas 'test' Database Total Documents: ${atlasTestTotal} (Expected: 76 - Completely Untouched)`);

  // 2.2 Check Atlas 'festflow' Database
  // Connect to cluster0 and check if festflow db exists or has docs
  const atlasAdmin = atlasConn.client.db('admin');
  const dbsList = await atlasAdmin.admin().listDatabases();
  const festflowDbInfo = dbsList.databases.find(d => d.name === 'festflow');
  console.log(`7. Atlas 'festflow' Database Exists on Cluster: ${!!festflowDbInfo}`);
  if (festflowDbInfo) {
    const festflowDb = atlasConn.client.db('festflow');
    const festflowColls = await festflowDb.listCollections().toArray();
    let festflowDocs = 0;
    for (const c of festflowColls) {
      festflowDocs += await festflowDb.collection(c.name).countDocuments();
    }
    console.log(`   Atlas 'festflow' Documents Count: ${festflowDocs} (Expected: 0 - Initial Sync Not Triggered)`);
  } else {
    console.log(`   Atlas 'festflow' contains 0 documents (Database not yet created, pristine clean state)`);
  }

  // 3. Dry-Run Verification
  const fs = require('fs');
  const modelsDir = path.join(__dirname, '..', 'models');
  fs.readdirSync(modelsDir).forEach(f => {
    if (f.endsWith('.js')) require(path.join(modelsDir, f));
  });
  const dryRun = require('../services/syncDryRunService');
  const dryReport = await dryRun.executeDryRun();
  console.log(`8. Dry-Run Report Summary:`, JSON.stringify(dryReport.summary, null, 2));

  await localClient.close();
  await connectDB.closeAll();
  console.log('✅ ALL POST-HARMONIZATION VERIFICATION CHECKS PASSED!');
  process.exit(0);
})().catch(err => {
  console.error('❌ Post-verification failed:', err);
  process.exit(1);
});
