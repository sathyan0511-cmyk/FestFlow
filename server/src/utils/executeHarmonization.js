const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function runHarmonization() {
  const uri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('festflow');

  console.log('================================================================');
  console.log(' FestFlow Phase 3.4.3: Local Data Harmonization Execution');
  console.log('================================================================');

  // Baseline Queue Count
  const queueBefore = await db.collection('syncqueues').countDocuments();
  const tombstonesBefore = await db.collection('synctombstones').countDocuments();
  console.log(`Initial System Counts: SyncQueue = ${queueBefore}, SyncTombstone = ${tombstonesBefore}`);

  // ============================================================================
  // STEP 1: ORPHAN QUARANTINE
  // ============================================================================
  console.log('\n--- STEP 1: Orphan Quarantine Validation & Execution ---');
  
  const allMemberships = await db.collection('clubmemberships').find({}).toArray();
  console.log(`Found ${allMemberships.length} total clubmemberships in active collection.`);

  const validSeedId = new ObjectId('6ae7011740e5a2d1e84d5bad');
  const validSeedMembership = allMemberships.find(m => m._id.equals(validSeedId));
  if (!validSeedMembership) {
    throw new Error('FATAL: Valid seed student membership 6ae7011740e5a2d1e84d5bad not found!');
  }
  
  // Verify valid membership parents exist
  const seedUser = await db.collection('users').findOne({ _id: validSeedMembership.user });
  const seedClub = await db.collection('clubs').findOne({ _id: validSeedMembership.club });
  if (!seedUser || !seedClub) {
    throw new Error('FATAL: Valid seed membership parents do not exist!');
  }
  console.log(`✅ Valid seed student membership confirmed (User: ${seedUser.name}, Club: ${seedClub.name}).`);

  // Target 24 orphans
  const orphans = allMemberships.filter(m => !m._id.equals(validSeedId));
  if (orphans.length !== 24) {
    throw new Error(`FATAL: Expected exactly 24 orphaned memberships, but found ${orphans.length}!`);
  }

  // Verify all 24 are genuinely orphans
  for (const o of orphans) {
    const u = await db.collection('users').findOne({ _id: o.user });
    const c = await db.collection('clubs').findOne({ _id: o.club });
    if (u !== null || c !== null) {
      throw new Error(`FATAL: Record ${o._id} has an existing parent! u: ${!!u}, c: ${!!c}. Aborting.`);
    }
  }
  console.log(`✅ Verified: All 24 target records have genuinely missing parents.`);

  // Copy to _orphaned_clubmemberships_backup
  const backupColl = db.collection('_orphaned_clubmemberships_backup');
  // Check if backup collection already exists
  const existingBackupCount = await backupColl.countDocuments();
  if (existingBackupCount > 0) {
    throw new Error(`FATAL: _orphaned_clubmemberships_backup already contains ${existingBackupCount} records!`);
  }

  console.log(`Copying 24 documents to '_orphaned_clubmemberships_backup'...`);
  const insertRes = await backupColl.insertMany(orphans);
  if (insertRes.insertedCount !== 24) {
    throw new Error(`FATAL: Inserted count mismatch: expected 24, got ${insertRes.insertedCount}`);
  }

  // Document Equality Check
  console.log('Performing 100% document equality check between original and backup...');
  for (const original of orphans) {
    const backupDoc = await backupColl.findOne({ _id: original._id });
    if (!backupDoc) {
      throw new Error(`FATAL: Document ${original._id} missing in backup collection!`);
    }
    const origJson = JSON.stringify(original);
    const backJson = JSON.stringify(backupDoc);
    if (origJson !== backJson) {
      throw new Error(`FATAL: Document equality mismatch for ${original._id}! Aborting without deletion.`);
    }
  }
  console.log('✅ Document equality check passed: 24/24 documents match byte-for-byte.');

  // Remove from active clubmemberships
  const orphanIds = orphans.map(o => o._id);
  const deleteRes = await db.collection('clubmemberships').deleteMany({ _id: { $in: orphanIds } });
  console.log(`Deleted ${deleteRes.deletedCount} orphaned records from active 'clubmemberships'.`);

  const activeRemaining = await db.collection('clubmemberships').countDocuments();
  if (activeRemaining !== 1) {
    throw new Error(`FATAL: Expected exactly 1 remaining active membership, found ${activeRemaining}!`);
  }
  const remainingDoc = await db.collection('clubmemberships').findOne({});
  if (!remainingDoc._id.equals(validSeedId)) {
    throw new Error(`FATAL: Remaining active membership is not the valid seed! Found: ${remainingDoc._id}`);
  }
  console.log(`✅ Orphan quarantine successfully completed. Exactly 1 valid record in active collection.`);

  // ============================================================================
  // STEP 2: VERSION INITIALIZATION
  // ============================================================================
  console.log('\n--- STEP 2: Version Initialization Validation & Execution ---');

  const domainCollections = [
    'users', 'venues', 'clubs', 'events', 'clubmemberships', 'registrations',
    'caterings', 'budgets', 'expenses', 'revenues', 'eventsponsors',
    'competitions', 'feedbacks', 'volunteers', 'certificates', 'payments',
    'teams', 'judges', 'judgingcriterias', 'prizes', 'judgescores',
    'results', 'sponsors'
  ];

  const versionFilter = {
    $or: [
      { _syncVersion: { $exists: false } },
      { _syncVersion: null }
    ]
  };

  let totalUnversionedBefore = 0;
  const unversionedByColl = {};

  for (const collName of domainCollections) {
    const count = await db.collection(collName).countDocuments(versionFilter);
    if (count > 0) {
      unversionedByColl[collName] = count;
      totalUnversionedBefore += count;
    }
  }

  console.log(`Found ${totalUnversionedBefore} unversioned documents across ${Object.keys(unversionedByColl).length} collections.`);
  console.log('Breakdown:', JSON.stringify(unversionedByColl, null, 2));

  // Perform Native Driver Update
  let updatedTotal = 0;
  for (const collName of Object.keys(unversionedByColl)) {
    const res = await db.collection(collName).updateMany(versionFilter, { $set: { _syncVersion: 1 } });
    updatedTotal += res.modifiedCount;
    console.log(`   Updated '${collName}': ${res.modifiedCount} documents set to _syncVersion: 1`);
  }

  if (updatedTotal !== totalUnversionedBefore) {
    throw new Error(`FATAL: Updated count (${updatedTotal}) did not match unversioned count (${totalUnversionedBefore})!`);
  }

  // Verify missing version count is now 0
  let totalUnversionedAfter = 0;
  for (const collName of domainCollections) {
    const count = await db.collection(collName).countDocuments(versionFilter);
    totalUnversionedAfter += count;
  }
  if (totalUnversionedAfter !== 0) {
    throw new Error(`FATAL: After update, ${totalUnversionedAfter} documents still lack _syncVersion!`);
  }
  console.log('✅ Version initialization complete: 0 unversioned documents remain across all 23 collections.');

  // ============================================================================
  // STEP 3: QUEUE INVARIANCE VERIFICATION
  // ============================================================================
  console.log('\n--- STEP 3: Queue Invariance Verification ---');
  const queueAfter = await db.collection('syncqueues').countDocuments();
  const tombstonesAfter = await db.collection('synctombstones').countDocuments();
  console.log(`Post-Execution System Counts: SyncQueue = ${queueAfter}, SyncTombstone = ${tombstonesAfter}`);

  if (queueAfter !== queueBefore) {
    throw new Error(`FATAL: SyncQueue count changed! Before: ${queueBefore}, After: ${queueAfter}`);
  }
  if (tombstonesAfter !== tombstonesBefore) {
    throw new Error(`FATAL: SyncTombstone count changed! Before: ${tombstonesBefore}, After: ${tombstonesAfter}`);
  }
  console.log('✅ Zero mutation queue activity confirmed: Native driver operations completely bypassed Mongoose hooks.');

  // ============================================================================
  // STEP 4: FACULTY RECORD VERIFICATION (HOLD STATUS)
  // ============================================================================
  console.log('\n--- STEP 4: Faculty Record Verification ---');
  const facultyUser = await db.collection('users').findOne({ email: 'faculty@festflow.edu' });
  if (!facultyUser) {
    throw new Error('FATAL: Faculty user not found!');
  }
  if (!facultyUser._id.equals(new ObjectId('6ae70115a2ab160fb98025c5'))) {
    throw new Error(`FATAL: Faculty ObjectId modified! Current: ${facultyUser._id}`);
  }
  if (facultyUser.name !== 'Dr. Meenakshi Sundaram' || facultyUser.phone !== '+91 98765 43213') {
    throw new Error('FATAL: Faculty identity fields were modified!');
  }
  console.log(`✅ Faculty record untouched and verified:`);
  console.log(`   _id: ${facultyUser._id}`);
  console.log(`   name: "${facultyUser.name}"`);
  console.log(`   email: "${facultyUser.email}"`);
  console.log(`   phone: "${facultyUser.phone}"`);
  console.log(`   _syncVersion: ${facultyUser._syncVersion}`);
  console.log(`   STATUS: HELD FROM INITIAL SYNCHRONIZATION PENDING MANUAL VERIFICATION`);

  // ============================================================================
  // STEP 5: FINAL DOMAIN DOCUMENT COUNT VERIFICATION
  // ============================================================================
  console.log('\n--- STEP 5: Final Domain Document Count Verification ---');
  let activeDomainCount = 0;
  const systemColls = new Set(['syncqueues', 'synctombstones', 'syncconflicts', '_orphaned_clubmemberships_backup']);
  const allColls = await db.listCollections().toArray();
  for (const c of allColls) {
    if (!systemColls.has(c.name) && !c.name.startsWith('test_')) {
      const count = await db.collection(c.name).countDocuments();
      activeDomainCount += count;
    }
  }
  console.log(`Total Active Domain Documents: ${activeDomainCount} (Expected: 38)`);
  if (activeDomainCount !== 38) {
    throw new Error(`FATAL: Expected exactly 38 active domain documents, found ${activeDomainCount}!`);
  }
  console.log('✅ Final active domain document count is exactly 38.');

  await client.close();
  console.log('\n================================================================');
  console.log(' ✅ ALL PHASE 3.4.3 HARMONIZATION TASKS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  return {
    quarantinedCount: 24,
    versionedCount: updatedTotal,
    activeDomainCount: 38,
    queueInvarianceVerified: true
  };
}

if (require.main === module) {
  runHarmonization()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Harmonization Execution Failed:', err);
      process.exit(1);
    });
}

module.exports = runHarmonization;
