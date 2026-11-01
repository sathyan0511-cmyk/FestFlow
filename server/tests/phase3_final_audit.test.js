require('dotenv').config();
const mongoose = require('mongoose');
const { SyncWorkerService, DEPENDENCY_TIERS, PARENT_REF_MAP } = require('../src/services/syncWorkerService');
const syncQueueService = require('../src/services/syncQueueService');
const SyncQueue = require('../src/models/SyncQueue');
const SyncConflict = require('../src/models/SyncConflict');
const SyncTombstone = require('../src/models/SyncTombstone');
const connectDB = require('../src/config/db');

let mockAtlasDb;
const MOCK_ATLAS_URI = 'mongodb://127.0.0.1:27017/festflow_phase3_audit_mock_atlas';

async function setup() {
  await connectDB();
  mockAtlasDb = mongoose.createConnection(MOCK_ATLAS_URI);
  await mockAtlasDb.asPromise();

  await cleanTestArtifacts();
}

async function cleanTestArtifacts() {
  await SyncQueue.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncConflict.deleteMany({ collectionName: { $regex: /^test_/ } });
  await SyncTombstone.deleteMany({ collectionName: { $regex: /^test_/ } });

  if (mockAtlasDb && mockAtlasDb.db) {
    const collections = await mockAtlasDb.db.listCollections().toArray();
    for (const coll of collections) {
      if (coll.name.startsWith('test_')) {
        await mockAtlasDb.collection(coll.name).drop().catch(() => {});
      }
    }
  }
}

async function teardown() {
  await cleanTestArtifacts();
  if (mockAtlasDb) {
    try {
      await mockAtlasDb.close();
    } catch (_) {}
  }
  if (typeof connectDB.closeAll === 'function') {
    await connectDB.closeAll();
  }
}

async function runAudit() {
  console.log('🔬 Starting Comprehensive Phase 3.1 Targeted Code Audit Suite...\n');
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
    // =========================================================================
    // SECTION 1: Dependency Ordering Across Batches & Failure Scenarios
    // =========================================================================
    console.log('--- SECTION 1: Dependency Ordering Across Batches ---');

    // 1a. Parent and child in the same batch
    console.log('Testing: Parent and child in the same batch...');
    const parentEventId1 = new mongoose.Types.ObjectId();
    const childRegId1 = new mongoose.Types.ObjectId();

    await syncQueueService.enqueueMutation({
      collectionName: 'test_events',
      documentId: parentEventId1,
      operation: 'CREATE',
      payload: { _id: parentEventId1, title: 'Same Batch Event', _syncVersion: 1 },
      version: 1
    });

    await syncQueueService.enqueueMutation({
      collectionName: 'test_registrations',
      documentId: childRegId1,
      operation: 'CREATE',
      payload: { _id: childRegId1, event: parentEventId1, studentName: 'Test Student 1', _syncVersion: 1 },
      version: 1
    });

    const sameBatchWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ },
      batchSize: 10
    });

    const res1 = await sameBatchWorker.processBatch();
    assert(res1.synced === 2, '1a. Both parent (event) and child (registration) synced in same batch');
    const cloudEvent1 = await mockAtlasDb.collection('test_events').findOne({ _id: parentEventId1 });
    const cloudReg1 = await mockAtlasDb.collection('test_registrations').findOne({ _id: childRegId1 });
    assert(cloudEvent1 !== null && cloudReg1 !== null, '1b. Both documents exist on Atlas');

    // 1b. Parent and child in separate batches (batchSize = 1)
    console.log('\nTesting: Parent and child in separate batches (batchSize = 1)...');
    const parentEventId2 = new mongoose.Types.ObjectId();
    const childRegId2 = new mongoose.Types.ObjectId();

    // Enqueue child first, then parent!
    const childJob2 = await syncQueueService.enqueueMutation({
      collectionName: 'test_registrations',
      documentId: childRegId2,
      operation: 'CREATE',
      payload: { _id: childRegId2, event: parentEventId2, studentName: 'Test Student 2', _syncVersion: 1 },
      version: 1
    });

    const parentJob2 = await syncQueueService.enqueueMutation({
      collectionName: 'test_events',
      documentId: parentEventId2,
      operation: 'CREATE',
      payload: { _id: parentEventId2, title: 'Separate Batch Event', _syncVersion: 1 },
      version: 1
    });

    const smallBatchWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ },
      batchSize: 1
    });

    // Run first batch: Tier sorting ensures parent (test_events, Tier 1) is chosen before child (Tier 2)!
    const b1 = await smallBatchWorker.processBatch();
    assert(b1.synced === 1, '1c. Batch 1 synced parent event');
    const pCheck = await SyncQueue.findById(parentJob2._id);
    assert(pCheck.status === 'synced', '1d. Parent event transitioned to synced in Batch 1');

    // Run second batch: Now child registration can sync because parent is on Atlas!
    const b2 = await smallBatchWorker.processBatch();
    assert(b2.synced === 1, '1e. Batch 2 synced child registration');
    const cCheck = await SyncQueue.findById(childJob2._id);
    assert(cCheck.status === 'synced', '1f. Child registration transitioned to synced in Batch 2');

    // 1c. Parent job fails while child job is pending
    console.log('\nTesting: Parent job fails while child is pending (child must defer)...');
    const failingParentEventId = new mongoose.Types.ObjectId();
    const blockedChildRegId = new mongoose.Types.ObjectId();

    const mockFailingParentAtlas = {
      collection: (name) => {
        if (name === 'test_events') {
          return {
            findOne: async () => null,
            replaceOne: async () => { throw new Error('Simulated event write disk full'); }
          };
        }
        return mockAtlasDb.collection(name);
      }
    };

    const failParentWorker = new SyncWorkerService({
      atlasConn: mockFailingParentAtlas,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ },
      batchSize: 10
    });

    const failParentJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_events',
      documentId: failingParentEventId,
      operation: 'CREATE',
      payload: { _id: failingParentEventId, title: 'Failing Event', _syncVersion: 1 },
      version: 1
    });

    const blockedChildJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_registrations',
      documentId: blockedChildRegId,
      operation: 'CREATE',
      payload: { _id: blockedChildRegId, event: failingParentEventId, studentName: 'Blocked Student', _syncVersion: 1 },
      version: 1
    });

    const failRes = await failParentWorker.processBatch();
    assert(failRes.failed === 1, '1g. Parent job failed');
    assert(failRes.deferred >= 1, '1h. Child job was deferred');

    const checkBlockedChild = await SyncQueue.findById(blockedChildJob._id);
    assert(checkBlockedChild.status === 'pending', '1i. Blocked child remains pending');
    assert(checkBlockedChild.retryCount === 0, '1j. Deferred child did NOT burn retry attempts');

    // 1d. Parent job exceeds retry limit
    console.log('\nTesting: Parent job exceeds retry limit...');
    await SyncQueue.findByIdAndUpdate(failParentJob._id, { $set: { retryCount: 4 } });
    failParentWorker.options.maxRetries = 5;

    await failParentWorker.processBatch();
    const permanentFailParent = await SyncQueue.findById(failParentJob._id);
    assert(permanentFailParent.status === 'failed', '1k. Parent transitioned to permanently failed');

    // Child in subsequent batch must still NOT upload!
    const subsequentBatch = await failParentWorker.processBatch();
    const stillBlockedChild = await SyncQueue.findById(blockedChildJob._id);
    assert(stillBlockedChild.status === 'pending', '1l. Child still prevented from uploading when parent is permanently failed');

    // 1e. Parent succeeds on later retry
    console.log('\nTesting: Parent succeeds on later retry (child unblocked)...');
    // Fix parent by using valid mockAtlasDb
    await SyncQueue.findByIdAndUpdate(failParentJob._id, { $set: { status: 'pending', retryCount: 0 } });
    const recoveryWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ },
      batchSize: 10
    });

    const recBatch = await recoveryWorker.processBatch();
    assert(recBatch.synced >= 2, '1m. Recovery batch synced parent and unblocked child');

    const recoveredChild = await SyncQueue.findById(blockedChildJob._id);
    assert(recoveredChild.status === 'synced', '1n. Child is now successfully synced on Atlas');

    // 1f. Circular / Mutual References (User <-> Club)
    console.log('\nTesting: Circular references between User and Club...');
    const testUserId = new mongoose.Types.ObjectId();
    const testClubId = new mongoose.Types.ObjectId();

    // User references Club
    const userJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_users',
      documentId: testUserId,
      operation: 'CREATE',
      payload: { _id: testUserId, name: 'Faculty Lead', clubs: [testClubId], _syncVersion: 1 },
      version: 1
    });

    // Club references User
    const clubJob = await syncQueueService.enqueueMutation({
      collectionName: 'test_clubs',
      documentId: testClubId,
      operation: 'CREATE',
      payload: { _id: testClubId, clubName: 'Robotics Club', facultyCoordinator: testUserId, _syncVersion: 1 },
      version: 1
    });

    const mutualWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ }
    });

    const mutualRes = await mutualWorker.processBatch();
    assert(mutualRes.synced === 2, '1o. Both User and Club synced successfully without deadlock');

    const cloudUser = await mockAtlasDb.collection('test_users').findOne({ _id: testUserId });
    const cloudClub = await mockAtlasDb.collection('test_clubs').findOne({ _id: testClubId });
    assert(cloudUser !== null && cloudClub !== null, '1p. Both circular documents exist on Atlas');

    // =========================================================================
    // SECTION 2: Version and Conflict Handling (All 9 Cases)
    // =========================================================================
    console.log('\n--- SECTION 2: Version and Conflict Handling ---');

    const conflictWorker = new SyncWorkerService({
      atlasConn: mockAtlasDb,
      isAtlasConnected: () => true,
      enabled: true,
      collectionFilter: { $regex: /^test_/ }
    });

    // Case 1: Atlas document version is greater than local version
    console.log('Case 1: Atlas version > Local version (Conflict)...');
    const idC1 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC1,
      name: 'Atlas New Venue',
      _syncVersion: 10
    });
    const jobC1 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC1,
      operation: 'UPDATE',
      payload: { _id: idC1, name: 'Local Stale Venue', _syncVersion: 6 },
      version: 6
    });
    await conflictWorker.processBatch();
    const updatedC1 = await SyncQueue.findById(jobC1._id);
    assert(updatedC1.status === 'conflict', '2a. Case 1: Job marked as conflict');
    const docAtlasC1 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC1 });
    assert(docAtlasC1._syncVersion === 10, '2b. Case 1: Atlas document version 10 was preserved');
    assert(docAtlasC1.name === 'Atlas New Venue', '2c. Case 1: Atlas payload not overwritten');

    // Case 2: Atlas document version is lower than local version
    console.log('Case 2: Atlas version < Local version (Safe overwrite)...');
    const idC2 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC2,
      name: 'Atlas Old Venue',
      _syncVersion: 2
    });
    const jobC2 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC2,
      operation: 'UPDATE',
      payload: { _id: idC2, name: 'Local Newer Venue', _syncVersion: 4 },
      version: 4
    });
    await conflictWorker.processBatch();
    const updatedC2 = await SyncQueue.findById(jobC2._id);
    assert(updatedC2.status === 'synced', '2d. Case 2: Job marked as synced');
    const docAtlasC2 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC2 });
    assert(docAtlasC2._syncVersion === 4, '2e. Case 2: Atlas updated to version 4');
    assert(docAtlasC2.name === 'Local Newer Venue', '2f. Case 2: Atlas updated with local payload');

    // Case 3: Atlas and local versions are equal
    console.log('Case 3: Atlas version == Local version (Idempotent acknowledge)...');
    const idC3 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC3,
      name: 'Identical Venue',
      _syncVersion: 3
    });
    const jobC3 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC3,
      operation: 'UPDATE',
      payload: { _id: idC3, name: 'Identical Venue', _syncVersion: 3 },
      version: 3
    });
    await conflictWorker.processBatch();
    const updatedC3 = await SyncQueue.findById(jobC3._id);
    assert(updatedC3.status === 'synced', '2g. Case 3: Equal version acknowledged as synced');
    const conflictC3 = await SyncConflict.findOne({ documentId: idC3 });
    assert(conflictC3 === null, '2h. Case 3: No unnecessary conflict record created');

    // Case 4: Atlas document does not exist
    console.log('Case 4: Atlas document does not exist (Create document)...');
    const idC4 = new mongoose.Types.ObjectId();
    const jobC4 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC4,
      operation: 'CREATE',
      payload: { _id: idC4, name: 'Brand New Venue', _syncVersion: 1 },
      version: 1
    });
    await conflictWorker.processBatch();
    const docAtlasC4 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC4 });
    assert(docAtlasC4 !== null, '2i. Case 4: Document created on Atlas');
    assert(docAtlasC4._syncVersion === 1, '2j. Case 4: _syncVersion set to 1');

    // Case 5: Atlas document has no _syncVersion
    console.log('Case 5: Atlas document has no _syncVersion (Defaults to 1)...');
    const idC5 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC5,
      name: 'Legacy Atlas Document'
      // no _syncVersion
    });
    const jobC5 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC5,
      operation: 'UPDATE',
      payload: { _id: idC5, name: 'Upgraded Document', _syncVersion: 2 },
      version: 2
    });
    await conflictWorker.processBatch();
    const docAtlasC5 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC5 });
    assert(docAtlasC5._syncVersion === 2, '2k. Case 5: Safely upgraded legacy document to version 2');

    // Case 6: Local document has no _syncVersion
    console.log('Case 6: Local document has no _syncVersion (Defaults to 1)...');
    const idC6 = new mongoose.Types.ObjectId();
    const jobC6 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC6,
      operation: 'CREATE',
      payload: { _id: idC6, name: 'Local Legacy Doc' },
      version: null // simulated missing version
    });
    await conflictWorker.processBatch();
    const docAtlasC6 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC6 });
    assert(docAtlasC6 !== null, '2l. Case 6: Local legacy doc created on Atlas');
    assert(docAtlasC6._syncVersion === 1, '2m. Case 6: _syncVersion defaulted to 1');

    // Case 7: Retry occurs after successful Atlas upload but before queue acknowledgement
    console.log('Case 7: Retry after successful Atlas upload but before queue ACK...');
    const idC7 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC7,
      name: 'Already On Cloud',
      _syncVersion: 1
    });
    // Local job still marked pending (as if crash occurred right before ACK)
    const jobC7 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC7,
      operation: 'CREATE',
      payload: { _id: idC7, name: 'Already On Cloud', _syncVersion: 1 },
      version: 1
    });
    await conflictWorker.processBatch();
    const updatedC7 = await SyncQueue.findById(jobC7._id);
    assert(updatedC7.status === 'synced', '2n. Case 7: Job successfully transitioned to synced idempotently');
    const conflictC7 = await SyncConflict.findOne({ documentId: idC7 });
    assert(conflictC7 === null, '2o. Case 7: Zero conflict created');

    // Case 8: Two workers attempt to process the same document
    console.log('Case 8: Two workers attempt to process same document (Atomic claim)...');
    const idC8 = new mongoose.Types.ObjectId();
    const jobC8 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC8,
      operation: 'CREATE',
      payload: { _id: idC8, name: 'Race Condition Hall' },
      version: 1
    });
    const [w1Claim, w2Claim] = await Promise.all([
      syncQueueService.claimPendingJob(jobC8._id),
      syncQueueService.claimPendingJob(jobC8._id)
    ]);
    const claimedCount = (w1Claim ? 1 : 0) + (w2Claim ? 1 : 0);
    assert(claimedCount === 1, '2p. Case 8: Only one worker succeeded in claiming the job');
    assert((w1Claim || w2Claim).status === 'processing', '2q. Case 8: Claimed job is in processing state');

    // Case 9: Older queued job is retried after a newer version has already reached Atlas
    console.log('Case 9: Older queued job retried after newer version already reached Atlas...');
    const idC9 = new mongoose.Types.ObjectId();
    await mockAtlasDb.collection('test_venues').insertOne({
      _id: idC9,
      name: 'Atlas Version 5 (Newest)',
      _syncVersion: 5
    });
    const oldJobC9 = await syncQueueService.enqueueMutation({
      collectionName: 'test_venues',
      documentId: idC9,
      operation: 'UPDATE',
      payload: { _id: idC9, name: 'Local Version 2 (Stale)', _syncVersion: 2 },
      version: 2
    });
    await conflictWorker.processBatch();
    const updatedOldJob = await SyncQueue.findById(oldJobC9._id);
    assert(updatedOldJob.status === 'conflict', '2r. Case 9: Older retried job caught as conflict');
    const atlasDocC9 = await mockAtlasDb.collection('test_venues').findOne({ _id: idC9 });
    assert(atlasDocC9.name === 'Atlas Version 5 (Newest)', '2s. Case 9: Atlas was NOT overwritten by stale retry');
    assert(atlasDocC9._syncVersion === 5, '2t. Case 9: Atlas version 5 maintained');

    // =========================================================================
    // SECTION 3: Queue Lifecycle & Recovery
    // =========================================================================
    console.log('\n--- SECTION 3: Queue Lifecycle & Recovery ---');
    const idL1 = new mongoose.Types.ObjectId();
    const lifecycleJob = await SyncQueue.create({
      collectionName: 'test_venues',
      documentId: idL1,
      operation: 'CREATE',
      payload: { _id: idL1, name: 'Lifecycle Venue' },
      version: 1,
      idempotencyKey: `test_venues:${idL1}:v1:CREATE`,
      status: 'processing',
      processingStartedAt: new Date(Date.now() - 600000) // 10 minutes ago
    });

    // Stale recovery
    const recovered = await syncQueueService.recoverStaleProcessingJobs(300000);
    assert(recovered >= 1, '3a. Stale job recovered');
    const postRecoveryJob = await SyncQueue.findById(lifecycleJob._id);
    assert(postRecoveryJob.status === 'pending', '3b. Recovered job status is pending');
    assert(postRecoveryJob.retryCount === 1, '3c. Recovered job retryCount incremented');

    // =========================================================================
    // SECTION 4: Production Runtime Isolation
    // =========================================================================
    console.log('\n--- SECTION 4: Production Runtime Isolation ---');
    const prodWorker = new SyncWorkerService({
      isOfflineMode: false // Direct cloud mode (Render)
    });
    const prodConfig = prodWorker.getConfig();
    assert(prodConfig.enabled === false, '4a. Production direct-cloud mode strictly forces enabled: false');
    const prodStart = await prodWorker.start();
    assert(prodStart === false, '4b. Sync worker start() rejected in direct-cloud mode');

    // ENABLE_CLOUD_SYNC=false check
    process.env.ENABLE_CLOUD_SYNC = 'false';
    const disabledWorker = new SyncWorkerService({ isOfflineMode: true });
    assert(disabledWorker.getConfig().enabled === false, '4c. ENABLE_CLOUD_SYNC=false stops worker');
    delete process.env.ENABLE_CLOUD_SYNC;

    console.log('\n====================================================');
    console.log(`TARGETED AUDIT SUITE: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================\n');
  } finally {
    await teardown();
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
