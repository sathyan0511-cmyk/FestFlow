/**
 * FestFlow Phase 3.6.2 — Controlled Offline Acceptance Sync Runner
 * 
 * Safely synchronizes ONLY the isolated offline acceptance test event
 * ("Offline Acceptance Test Hackathon 2026") from local MongoDB to Atlas "festflow".
 * 
 * Safeguards:
 * 1. Strictly targets Atlas 'festflow'. Never writes to Atlas 'test'.
 * 2. Leaves all 241 historical SyncQueue jobs completely untouched.
 * 3. Excludes held faculty account and quarantined memberships.
 * 4. Preserves canonical local ObjectId and BSON types.
 * 5. Uses atomic ICAS versioning.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');
const syncWorker = require('../src/services/syncWorkerService');
const SyncQueue = require('../src/models/SyncQueue');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/festflow';
const CLOUD_URI = process.env.CLOUD_MONGODB_URI;
const TARGET_CLOUD_DB = process.env.CLOUD_DB_NAME || 'festflow';
const TEST_EVENT_TITLE = 'Offline Acceptance Test Hackathon 2026';

if (!CLOUD_URI) {
  console.error('❌ CLOUD_MONGODB_URI is not set in server/.env');
  process.exit(1);
}

async function runAcceptanceSync() {
  console.log('======================================================================');
  console.log(' FestFlow Phase 3.6.2 — Offline Acceptance Sync Runner');
  console.log('======================================================================');
  console.log(`📡 Local MongoDB URI: ${LOCAL_URI}`);
  console.log(`☁️ Target Cloud Database: Atlas [${TARGET_CLOUD_DB}]`);
  console.log(`🎯 Target Event Title: "${TEST_EVENT_TITLE}"`);
  console.log('----------------------------------------------------------------------');

  // 1. Connect Mongoose to local MongoDB
  await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Connected to local MongoDB.');

  // 2. Connect native client to Atlas
  const atlasClient = new MongoClient(CLOUD_URI, { serverSelectionTimeoutMS: 10000 });
  await atlasClient.connect();
  const atlasDb = atlasClient.db(TARGET_CLOUD_DB);
  console.log(`✅ Connected to MongoDB Atlas [${TARGET_CLOUD_DB}].`);

  // Verify Atlas target safety
  if (atlasDb.databaseName === 'test') {
    throw new Error('⛔ SAFETY ABORT: Attempting to write to Atlas "test" database!');
  }

  // 3. Find the pending SyncQueue job for the test event
  console.log('\n🔍 Searching for pending SyncQueue job for offline acceptance event...');
  const testJob = await SyncQueue.findOne({
    collectionName: 'events',
    'payload.title': TEST_EVENT_TITLE,
    status: { $in: ['pending', 'failed'] }
  });

  if (!testJob) {
    // Check if it was already synced
    const alreadySynced = await SyncQueue.findOne({
      collectionName: 'events',
      'payload.title': TEST_EVENT_TITLE,
      status: 'synced'
    });

    if (alreadySynced) {
      console.log(`ℹ️ Job already marked SYNCED at ${alreadySynced.syncedAt}.`);
      console.log('Verifying Atlas state...');
      const cloudEvent = await atlasDb.collection('events').findOne({ title: TEST_EVENT_TITLE });
      if (cloudEvent) {
        console.log('✅ Event already exists on Atlas festflow with _id:', cloudEvent._id.toString());
        console.log(`   _syncVersion: ${cloudEvent._syncVersion}`);
      } else {
        console.warn('⚠️ Job is marked synced locally, but document was not found on Atlas.');
      }
      await cleanup();
      return;
    }

    console.error(`❌ No pending SyncQueue job found with title: "${TEST_EVENT_TITLE}".`);
    console.log('👉 Please ensure you created the event via the UI at http://localhost:5173/ while offline.');
    await cleanup();
    process.exit(1);
  }

  console.log(`📋 Found pending job: ID=${testJob._id}, DocumentId=${testJob.documentId}, Operation=${testJob.operation}, Version=${testJob.version}`);

  // 4. Verify parent references on Atlas festflow
  const clubId = testJob.payload.club;
  const venueId = testJob.payload.venue;

  console.log('\n🔗 Verifying foreign key parent references on Atlas...');
  const clubOnAtlas = await atlasDb.collection('clubs').findOne({ _id: new ObjectId(clubId) });
  if (!clubOnAtlas) {
    throw new Error(`Parent Club (${clubId}) not found on Atlas festflow!`);
  }
  console.log(`   Parent Club: "${clubOnAtlas.name}" (ID: ${clubOnAtlas._id}) ✅`);

  if (venueId) {
    const venueOnAtlas = await atlasDb.collection('venues').findOne({ _id: new ObjectId(venueId) });
    if (!venueOnAtlas) {
      throw new Error(`Parent Venue (${venueId}) not found on Atlas festflow!`);
    }
    console.log(`   Parent Venue: "${venueOnAtlas.name}" (ID: ${venueOnAtlas._id}) ✅`);
  }

  // 5. Execute atomic uploadJobToAtlas using ICAS
  console.log('\n🚀 Executing controlled atomic ICAS upload to Atlas...');
  testJob.status = 'processing';
  testJob.processedAt = new Date();
  await testJob.save();

  const syncResult = await syncWorker.uploadJobToAtlas(testJob.toObject(), atlasDb);
  console.log(`   Sync result:`, syncResult);

  if (syncResult.status === 'synced') {
    testJob.status = 'synced';
    testJob.syncedAt = new Date();
    testJob.lastError = null;
    await testJob.save();
    console.log('✅ SyncQueue job status updated to SYNCED.');
  } else if (syncResult.status === 'conflict') {
    testJob.status = 'conflict';
    testJob.lastError = syncResult.reason;
    await testJob.save();
    console.error('⚠️ Sync conflict encountered:', syncResult.reason);
  } else {
    testJob.status = 'failed';
    testJob.lastError = 'Unknown sync status';
    await testJob.save();
    console.error('❌ Sync failed:', syncResult);
  }

  // 6. Verify record directly on Atlas festflow
  console.log('\n☁️ Verifying synced event directly on Atlas [festflow]...');
  const atlasEvent = await atlasDb.collection('events').findOne({ _id: testJob.documentId });
  if (atlasEvent) {
    console.log('✅ VERIFICATION SUCCESSFUL: Document found on Atlas festflow!');
    console.log(`   _id:          ${atlasEvent._id}`);
    console.log(`   title:        ${atlasEvent.title}`);
    console.log(`   _syncVersion: ${atlasEvent._syncVersion}`);
    console.log(`   club:         ${atlasEvent.club}`);
    console.log(`   venue:        ${atlasEvent.venue}`);
    console.log(`   category:     ${atlasEvent.category}`);
  } else {
    console.error('❌ Document NOT found on Atlas festflow after sync!');
  }

  // 7. Verify Atlas test database remained completely untouched
  const atlasTestDb = atlasClient.db('test');
  const collectionsInTest = await atlasTestDb.listCollections().toArray();
  let testTotalDocs = 0;
  for (const c of collectionsInTest) {
    testTotalDocs += await atlasTestDb.collection(c.name).countDocuments();
  }
  console.log(`\n🛡️ Atlas [test] database doc count: ${testTotalDocs} (Expected: 76) ${testTotalDocs === 76 ? '✅ UNTOUCHED' : '⚠️ MISMATCH'}`);

  console.log('\n======================================================================');
  console.log(' Offline Acceptance Single-Record Sync Verification Completed');
  console.log('======================================================================\n');

  async function cleanup() {
    await mongoose.disconnect();
    await atlasClient.close();
  }

  await cleanup();
}

runAcceptanceSync().catch(err => {
  console.error('\n💥 FATAL ERROR during acceptance sync:', err.message);
  process.exit(1);
});
