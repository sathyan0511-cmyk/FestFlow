require('dotenv').config();
const mongoose = require('mongoose');
const { SyncWorkerService, DEPENDENCY_TIERS, getDependencyTier } = require('../src/services/syncWorkerService');
const syncQueueService = require('../src/services/syncQueueService');
const SyncQueue = require('../src/models/SyncQueue');
const SyncConflict = require('../src/models/SyncConflict');
const SyncTombstone = require('../src/models/SyncTombstone');
const connectDB = require('../src/config/db');

let primaryDb;
let mockAtlasDb;

const MOCK_ATLAS_URI = 'mongodb://127.0.0.1:27017/festflow_phase3_mock_atlas';

async function setup() {
  // Connect primary Mongoose to local MongoDB
  primaryDb = await connectDB();

  // Connect isolated secondary connection representing Atlas
  mockAtlasDb = mongoose.createConnection(MOCK_ATLAS_URI);
  await mockAtlasDb.asPromise();

  // Clean test artifacts
  await SyncQueue.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncConflict.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncTombstone.deleteMany({ collectionName: { $regex: /^test_/ } });

  const collections = await mockAtlasDb.db.listCollections().toArray();
  for (const coll of collections) {
    if (coll.name.startsWith('test_')) {
      await mockAtlasDb.collection(coll.name).drop();
    }
  }
}

async function teardown() {
  if (mockAtlasDb) {
    try {
      const collections = await mockAtlasDb.db.listCollections().toArray();
      for (const coll of collections) {
        if (coll.name.startsWith('test_')) {
          await mockAtlasDb.collection(coll.name).drop();
        }
      }
      await mockAtlasDb.close();
    } catch (_) {}
  }

  await SyncQueue.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncConflict.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncTombstone.deleteMany({ collectionName: { $regex: /^test_/ } });

  if (typeof connectDB.closeAll === 'function') {
    await connectDB.closeAll();
  }
}

async function runTests() {
  console.log('🧪 Starting Phase 3.1 Background Sync Worker Foundation Test Suite...\n');
  await setup();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // --- Test 1: Worker starts when enabled ---
    console.log('--- Test 1: Worker starts when enabled ---');
    const worker1 = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      syncIntervalMs: 60000,
      enabled: true
    });
    const started = await worker1.start();
    assert(started === true, '1a. Worker start() returned true');
    assert(worker1.isRunning === true, '1b. Worker isRunning is true');
    await worker1.stop();
    assert(worker1.isRunning === false, '1c. Worker stopped cleanly');

    // --- Test 2: Worker remains disabled when configuration disables it ---
    console.log('\n--- Test 2: Worker remains disabled when configuration disables it ---');
    const worker2 = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: false
    });
    const startDisabled = await worker2.start();
    assert(startDisabled === false, '2a. start() returned false when enabled: false');
    assert(worker2.isRunning === false, '2b. worker.isRunning remains false');

    // --- Test 3: Worker does not run in production direct-Atlas mode ---
    console.log('\n--- Test 3: Worker does not run in production direct-Atlas mode ---');
    const worker3 = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isOfflineMode: false // simulate direct cloud mode (Render)
    });
    const config3 = worker3.getConfig();
    assert(config3.enabled === false, '3a. Worker config automatically forces enabled: false in direct-cloud mode');
    const prodStart = await worker3.start();
    assert(prodStart === false, '3b. Worker did not start in production direct-cloud mode');

    // --- Test 4: Worker waits when Atlas is unavailable ---
    console.log('\n--- Test 4: Worker waits when Atlas is unavailable ---');
    const worker4 = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => false, // Atlas disconnected
      enabled: true
    });
    const disconnectedResult = await worker4.processBatch();
    assert(disconnectedResult.skipped === 'atlas_disconnected', '4a. processBatch() skipped cleanly when Atlas disconnected');
    assert(disconnectedResult.processed === 0, '4b. 0 jobs processed while Atlas offline');

    // --- Test 5: Pending CREATE job is uploaded to Atlas ---
    console.log('\n--- Test 5: Pending CREATE job is uploaded to Atlas ---');
    const docId5 = new mongoose.Types.ObjectId();
    const createJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId5,
      operation: 'CREATE',
      payload: { _id: docId5, name: 'Main Auditorium', capacity: 500, _syncVersion: 1 },
      version: 1
    });

    const activeWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      maxRetries: 3,
      collectionFilter: { $regex: /^test_/ }
    });

    const batch5 = await activeWorker.processBatch();
    assert(batch5.synced >= 1, '5a. Batch reported at least 1 job synced');

    const updatedJob5 = await SyncQueue.findById(createJob._id);
    assert(updatedJob5.status === 'synced', '5b. Job status transitioned from pending to synced');
    assert(updatedJob5.syncedAt !== null, '5c. syncedAt timestamp recorded');

    const cloudDoc5 = await mockAtlasDb.collection('test_venues').findOne({ _id: docId5 });
    assert(cloudDoc5 !== null, '5d. Document exists in Atlas collection');
    assert(cloudDoc5.name === 'Main Auditorium', '5e. Document payload preserved on Atlas');
    assert(cloudDoc5._syncVersion === 1, '5f. Document _syncVersion is 1 on Atlas');

    // --- Test 6: Pending UPDATE job is uploaded ---
    console.log('\n--- Test 6: Pending UPDATE job is uploaded ---');
    const updateJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId5,
      operation: 'UPDATE',
      payload: { _id: docId5, name: 'Main Auditorium - Renovated', capacity: 650, _syncVersion: 2 },
      version: 2
    });

    await activeWorker.processBatch();
    const updatedJob6 = await SyncQueue.findById(updateJob._id);
    assert(updatedJob6.status === 'synced', '6a. UPDATE job status transitioned to synced');

    const cloudDoc6 = await mockAtlasDb.collection('test_venues').findOne({ _id: docId5 });
    assert(cloudDoc6.capacity === 650, '6b. Atlas document capacity updated to 650');
    assert(cloudDoc6._syncVersion === 2, '6c. Atlas document version updated to 2');

    // --- Test 7: Pending DELETE job processes tombstone ---
    console.log('\n--- Test 7: Pending DELETE job processes tombstone ---');
    const deleteJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId5,
      operation: 'DELETE',
      payload: { _id: docId5, deletedAt: new Date() },
      version: 3
    });

    await activeWorker.processBatch();
    const updatedJob7 = await SyncQueue.findById(deleteJob._id);
    assert(updatedJob7.status === 'synced', '7a. DELETE job status transitioned to synced');

    const cloudDoc7 = await mockAtlasDb.collection('test_venues').findOne({ _id: docId5 });
    assert(cloudDoc7 === null, '7b. Document successfully removed from Atlas collection');

    // --- Test 8: Successful jobs acknowledged ONLY after Atlas confirmation ---
    console.log('\n--- Test 8: Successful jobs acknowledged ONLY after Atlas confirmation ---');
    const docId8 = new mongoose.Types.ObjectId();
    const mockFailingAtlas = {
      collection: () => ({
        findOne: async () => null,
        replaceOne: async () => ({ acknowledged: false }) // simulated driver non-acknowledgement
      })
    };
    const unackWorker = new SyncWorkerService({
      atlasConn: mockFailingAtlas,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ }
    });

    const unackJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId8,
      operation: 'CREATE',
      payload: { _id: docId8, name: 'Unack Hall' },
      version: 1
    });

    await unackWorker.processBatch();
    const checkJob8 = await SyncQueue.findById(unackJob._id);
    assert(checkJob8.status !== 'synced', '8a. Job was NOT marked synced when Atlas unacknowledged write');
    assert(checkJob8.status === 'pending', '8b. Job remained pending for subsequent retry');

    // --- Test 9: Failed uploads increment retry counts ---
    console.log('\n--- Test 9: Failed uploads increment retry counts ---');
    const initialRetries = checkJob8.retryCount;
    assert(initialRetries >= 1, `9a. Retry count incremented to ${initialRetries}`);
    assert(checkJob8.errorDetails !== null, '9b. errorDetails saved in job record');

    // --- Test 10: Retry limits are enforced ---
    console.log('\n--- Test 10: Retry limits are enforced ---');
    // Set retryCount to maxRetries - 1
    await SyncQueue.findByIdAndUpdate(unackJob._id, { $set: { retryCount: 4 } });
    const maxRetryWorker = new SyncWorkerService({
      atlasConn: mockFailingAtlas,
      isAtlasConnected: () => true,
      maxRetries: 5,
      enabled: true,
      collectionFilter: { $regex: /^test_/ }
    });

    await maxRetryWorker.processBatch();
    const exhaustedJob = await SyncQueue.findById(unackJob._id);
    assert(exhaustedJob.status === 'failed', '10a. Job transitioned to failed after exceeding maxRetries');
    assert(exhaustedJob.retryCount >= 5, '10b. Retry count reflects max retry limit');

    // --- Test 11: Stale processing jobs recover after restart ---
    console.log('\n--- Test 11: Stale processing jobs recover after restart ---');
    const docId11 = new mongoose.Types.ObjectId();
    const staleJob = await SyncQueue.create({
      collectionName: 'test_venues',
      documentId: docId11,
      operation: 'CREATE',
      payload: { _id: docId11, name: 'Stale Room' },
      version: 1,
      idempotencyKey: `test_venues:${docId11}:v1:CREATE`,
      status: 'processing',
      processingStartedAt: new Date(Date.now() - 1000000) // 1000s in the past
    });

    const recoveredCount = await syncQueueService.recoverStaleProcessingJobs(5000);
    assert(recoveredCount >= 1, `11a. Recovered ${recoveredCount} stale processing jobs`);
    const recoveredJob = await SyncQueue.findById(staleJob._id);
    assert(recoveredJob.status === 'pending', '11b. Stale job reverted to pending');

    // --- Test 12: Duplicate processing is prevented via atomic claim ---
    console.log('\n--- Test 12: Duplicate processing is prevented via atomic claim ---');
    const docId12 = new mongoose.Types.ObjectId();
    const testClaimJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId12,
      operation: 'CREATE',
      payload: { _id: docId12, name: 'Atomic Claim Hall' },
      version: 1
    });

    const [claim1, claim2] = await Promise.all([
      syncQueueService.claimPendingJob(testClaimJob._id),
      syncQueueService.claimPendingJob(testClaimJob._id)
    ]);

    const claimSuccessCount = (claim1 ? 1 : 0) + (claim2 ? 1 : 0);
    assert(claimSuccessCount === 1, '12a. Exactly one worker successfully claimed the job atomically');
    assert((claim1 ? claim2 : claim1) === null, '12b. Competing claim returned null');

    // --- Test 13: Older versions cannot overwrite newer Atlas data ---
    console.log('\n--- Test 13: Older versions cannot overwrite newer Atlas data ---');
    const docId13 = new mongoose.Types.ObjectId();
    // Pre-populate Atlas with newer version 5
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: docId13,
      name: 'Cloud New Version',
      capacity: 1000,
      _syncVersion: 5
    });

    // Enqueue an older local mutation version 3
    const oldJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: docId13,
      operation: 'UPDATE',
      payload: { _id: docId13, name: 'Old Local Stale', capacity: 200, _syncVersion: 3 },
      version: 3
    });

    await activeWorker.processBatch();
    const cloudDoc13 = await mockAtlasDb.collection('test_venues').findOne({ _id: docId13 });
    assert(cloudDoc13.name === 'Cloud New Version', '13a. Newer Atlas data was NOT overwritten');
    assert(cloudDoc13._syncVersion === 5, '13b. Atlas version remained 5');

    // --- Test 14: Conflicts are recorded correctly ---
    console.log('\n--- Test 14: Conflicts are recorded correctly ---');
    const updatedOldJob = await SyncQueue.findById(oldJob._id);
    assert(updatedOldJob.status === 'conflict', '14a. Queue job status updated to conflict');

    const conflictRec = await SyncConflict.findOne({ collectionName: 'test_venues', documentId: docId13 });
    assert(conflictRec !== null, '14b. Conflict record saved in sync_conflicts');
    assert(conflictRec.cloudVersion === 5, '14c. Conflict captured cloudVersion 5');
    assert(conflictRec.localVersion === 3, '14d. Conflict captured localVersion 3');
    assert(conflictRec.status === 'unresolved', '14e. Conflict status is unresolved');

    // --- Test 15: Dependency failures do not incorrectly acknowledge dependent jobs ---
    console.log('\n--- Test 15: Dependency failures do not acknowledge dependent jobs ---');
    const parentEventId = new mongoose.Types.ObjectId();
    const childRegId = new mongoose.Types.ObjectId();

    // Mock an Atlas connection where 'test_events' fails, but 'test_registrations' would succeed
    const mockDepAtlas = {
      collection: (name) => {
        if (name === 'test_events') {
          return {
            findOne: async () => null,
            replaceOne: async () => { throw new Error('Simulated event upload network fault'); }
          };
        }
        return mockAtlasDb.collection(name);
      }
    };

    const depWorker = new SyncWorkerService({
      atlasConn: mockDepAtlas,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ }
    });

    // Enqueue parent event (Tier 1) and child registration (Tier 2 referencing event)
    const parentJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_events',
      documentId: parentEventId,
      operation: 'CREATE',
      payload: { _id: parentEventId, title: 'HackFest 2026', _syncVersion: 1 },
      version: 1
    });

    const childJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_registrations',
      documentId: childRegId,
      operation: 'CREATE',
      payload: { _id: childRegId, event: parentEventId, studentName: 'Rohan Sharma', _syncVersion: 1 },
      version: 1
    });

    const depBatchResult = await depWorker.processBatch();
    assert(depBatchResult.deferred >= 1, '15a. Dependent child job was detected and deferred');

    const checkChildJob = await SyncQueue.findById(childJob._id);
    assert(checkChildJob.status === 'pending', '15b. Child job remained pending and was NOT incorrectly synced');

    const checkParentJob = await SyncQueue.findById(parentJob._id);
    assert(checkParentJob.status === 'pending', '15c. Parent job returned to pending with retry details');

    // Clean up temporary event/registration test jobs
    await SyncQueue.deleteMany({ _id: { $in: [parentJob._id, childJob._id] } });

    // --- Test 16: Graceful shutdown works ---
    console.log('\n--- Test 16: Graceful shutdown works ---');
    const worker16 = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      syncIntervalMs: 1000,
      enabled: true
    });
    await worker16.start();
    assert(worker16.isRunning === true, '16a. Worker is actively running');
    const stopped = await worker16.stop();
    assert(stopped === true, '16b. worker.stop() completed successfully');
    assert(worker16.isRunning === false, '16c. worker.isRunning is false');
    assert(worker16.pollTimer === null, '16d. Polling timer cleared');

    console.log('\n====================================================');
    console.log(`PHASE 3.1 WORKER SUITE: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================\n');
  } finally {
    await teardown();
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Phase 3 worker tests:', err);
  process.exit(1);
});
