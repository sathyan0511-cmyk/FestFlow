require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { SyncWorkerService } = require('../src/services/syncWorkerService');
const syncQueueService = require('../src/services/syncQueueService');
const SyncQueue = require('../src/models/SyncQueue');
const SyncTombstone = require('../src/models/SyncTombstone');
const SyncConflict = require('../src/models/SyncConflict');

const ISOLATED_ATLAS_DB = 'festflow_phase3_2_isolated_test';
const TEST_COLLECTION_PREFIX = 'test_phase3_2_';

// Define isolated test schemas & models using standard Mongoose paths (syncPlugin is active)
const venueTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    location: { type: String, default: '' }
  },
  { timestamps: true }
);

const eventTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Phase32Venue' }
  },
  { timestamps: true }
);

const registrationTestSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Phase32Event', required: true }
  },
  { timestamps: true }
);

const Phase32Venue = mongoose.models.Phase32Venue || mongoose.model('Phase32Venue', venueTestSchema, `${TEST_COLLECTION_PREFIX}venues`);
const Phase32Event = mongoose.models.Phase32Event || mongoose.model('Phase32Event', eventTestSchema, `${TEST_COLLECTION_PREFIX}events`);
const Phase32Registration = mongoose.models.Phase32Registration || mongoose.model('Phase32Registration', registrationTestSchema, `${TEST_COLLECTION_PREFIX}registrations`);

let atlasTestDb = null;

async function setup() {
  // Connect primary to local MongoDB
  await connectDB();

  // Wait for secondary Atlas connection
  let attempts = 0;
  while (!connectDB.isAtlasConnected() && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
  }

  const rawAtlas = connectDB.getAtlasConnection();
  if (!rawAtlas) {
    throw new Error('❌ Unable to establish secondary connection to MongoDB Atlas for E2E tests.');
  }

  // Switch to dedicated isolated test database on Atlas
  atlasTestDb = rawAtlas.useDb(ISOLATED_ATLAS_DB);
  console.log(`☁️ Atlas Connected for E2E Testing: Host=${rawAtlas.host}, IsolatedDB=${atlasTestDb.name}`);

  await cleanTestRecords();
}

async function cleanTestRecords() {
  // Clean local test records
  await SyncQueue.deleteMany({ collectionName: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) } });
  await SyncTombstone.deleteMany({ collectionName: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) } });
  await SyncConflict.deleteMany({ collectionName: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) } });

  await Phase32Registration.deleteMany({});
  await Phase32Event.deleteMany({});
  await Phase32Venue.deleteMany({});

  // Clean Atlas isolated test database collections
  if (atlasTestDb && atlasTestDb.db) {
    try {
      const collections = await atlasTestDb.db.listCollections().toArray();
      for (const col of collections) {
        if (col.name.startsWith(TEST_COLLECTION_PREFIX)) {
          await atlasTestDb.collection(col.name).drop().catch(() => {});
        }
      }
    } catch (_) {}
  }
}

async function teardown() {
  await cleanTestRecords();
  if (atlasTestDb && atlasTestDb.db) {
    try {
      await atlasTestDb.dropDatabase();
      console.log('🧹 Isolated Atlas test database dropped cleanly.');
    } catch (_) {}
  }
  if (typeof connectDB.closeAll === 'function') {
    await connectDB.closeAll();
  }
}

async function runE2ETests() {
  console.log('🧪 Starting FestFlow Phase 3.2 Controlled Local-to-Atlas Synchronization E2E Suite...\n');
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

  // Create isolated worker instance bound to Atlas test database
  const worker = new SyncWorkerService({
    atlasConn: atlasTestDb,
    isAtlasConnected: () => connectDB.isAtlasConnected(),
    enabled: true,
    enforceTestIsolation: true,
    collectionFilter: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) },
    batchSize: 25,
    maxRetries: 5
  });

  try {
    // =========================================================================
    // Test A: CREATE Pipeline
    // =========================================================================
    console.log('--- Test A: CREATE Pipeline (Local Write -> SyncQueue -> Atlas -> Synced) ---');
    const localVenueA = await Phase32Venue.create({
      name: 'Main Campus Convention Center',
      capacity: 2500,
      location: 'South Complex'
    });
    assert(localVenueA._id !== null, 'A1. Local test document created via Phase32Venue.create()');
    assert(localVenueA._syncVersion === 1, 'A2. syncPlugin initialized _syncVersion to 1');

    // Verify SyncQueue captured the CREATE mutation
    const queueJobA = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: localVenueA._id,
      operation: 'CREATE'
    });
    assert(queueJobA !== null, 'A3. CREATE job automatically enqueued in SyncQueue');
    assert(queueJobA.status === 'pending', 'A4. Initial job status is pending');
    assert(queueJobA.version === 1, 'A5. Queue version matches document version (1)');

    // Execute actual background worker batch
    const batchResA = await worker.processBatch();
    assert(batchResA.synced >= 1, 'A6. Worker processed and synced batch');

    // Verify document on Atlas
    const cloudDocA = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: localVenueA._id });
    assert(cloudDocA !== null, 'A7. Document verified in isolated Atlas test collection');
    assert(cloudDocA._id.toString() === localVenueA._id.toString(), 'A8. Document _id exactly preserved on Atlas');
    assert(cloudDocA.name === 'Main Campus Convention Center', 'A9. Business payload preserved on Atlas');
    assert(cloudDocA.capacity === 2500, 'A10. Field capacity preserved on Atlas');
    assert(cloudDocA._syncVersion === 1, 'A11. _syncVersion is 1 on Atlas');

    // Verify local queue acknowledgement
    const ackJobA = await SyncQueue.findById(queueJobA._id);
    assert(ackJobA.status === 'synced', 'A12. Queue job transitioned to status "synced"');
    assert(ackJobA.syncedAt !== null, 'A13. syncedAt timestamp successfully recorded');

    // =========================================================================
    // Test B: UPDATE Pipeline
    // =========================================================================
    console.log('\n--- Test B: UPDATE Pipeline (Local Update -> SyncQueue -> Atlas -> Synced) ---');
    const updatedLocalVenue = await Phase32Venue.findByIdAndUpdate(
      localVenueA._id,
      { capacity: 3200, location: 'South Complex - Expanded Wing' },
      { new: true }
    );
    assert(updatedLocalVenue.capacity === 3200, 'B1. Local document updated via findByIdAndUpdate()');
    assert(updatedLocalVenue._syncVersion === 2, 'B2. Monotonically incremented local _syncVersion to 2');

    // Verify UPDATE job enqueued
    const queueJobB = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: localVenueA._id,
      operation: 'UPDATE',
      version: 2
    });
    assert(queueJobB !== null, 'B3. UPDATE job captured in SyncQueue with version 2');
    assert(queueJobB.status === 'pending', 'B4. UPDATE job status is pending');

    // Process UPDATE via worker
    await worker.processBatch();

    // Verify document on Atlas
    const cloudDocB = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: localVenueA._id });
    assert(cloudDocB.capacity === 3200, 'B5. Atlas document capacity updated to 3200');
    assert(cloudDocB.location === 'South Complex - Expanded Wing', 'B6. Atlas location updated');
    assert(cloudDocB._syncVersion === 2, 'B7. Atlas _syncVersion updated to 2');

    const ackJobB = await SyncQueue.findById(queueJobB._id);
    assert(ackJobB.status === 'synced', 'B8. UPDATE queue job transitioned to synced');

    // =========================================================================
    // Test C: DELETE Pipeline & Tombstone Processing
    // =========================================================================
    console.log('\n--- Test C: DELETE Pipeline (Local Delete -> Tombstone -> Atlas Deletion -> Synced) ---');
    await Phase32Venue.findByIdAndDelete(localVenueA._id);

    // Verify local collection no longer has document
    const localDeleted = await Phase32Venue.findById(localVenueA._id);
    assert(localDeleted === null, 'C1. Document deleted from local MongoDB');

    // Verify Write-Ahead Tombstone exists
    const tombstoneC = await SyncTombstone.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: localVenueA._id
    });
    assert(tombstoneC !== null, 'C2. Write-Ahead Tombstone successfully persisted in synctombstones');
    assert(tombstoneC.documentId.toString() === localVenueA._id.toString(), 'C3. Tombstone preserves target document ID');

    // Verify DELETE job enqueued
    const queueJobC = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: localVenueA._id,
      operation: 'DELETE'
    });
    assert(queueJobC !== null, 'C4. DELETE job enqueued in SyncQueue');
    assert(queueJobC.status === 'pending', 'C5. DELETE job status is pending');

    // Process DELETE via worker
    await worker.processBatch();

    // Verify deletion on Atlas
    const cloudDocC = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: localVenueA._id });
    assert(cloudDocC === null, 'C6. Document successfully deleted from MongoDB Atlas collection');

    const ackJobC = await SyncQueue.findById(queueJobC._id);
    assert(ackJobC.status === 'synced', 'C7. DELETE queue job transitioned to synced');

    // Deletion Idempotency check: Process batch again
    const idempotentBatch = await worker.processBatch();
    assert(idempotentBatch.failed === 0, 'C8. Second batch run completed with 0 errors');
    assert(ackJobC.status === 'synced', 'C9. Deletion remains safely idempotent');

    // =========================================================================
    // Test D: Retry & Recovery Strategy
    // =========================================================================
    console.log('\n--- Test D: Retry & Recovery Strategy ---');
    const retryVenue = await Phase32Venue.create({
      name: 'Retry Arena',
      capacity: 500
    });

    const queueJobD = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: retryVenue._id,
      operation: 'CREATE'
    });

    // Simulate transient failure on Atlas
    const mockFaultyAtlas = {
      name: ISOLATED_ATLAS_DB,
      collection: () => ({
        findOne: async () => null,
        replaceOne: async () => { throw new Error('Simulated Atlas connection timeout during socket write'); }
      })
    };

    const faultyWorker = new SyncWorkerService({
      atlasConn: mockFaultyAtlas,
      isAtlasConnected: () => true,
      enabled: true,
      enforceTestIsolation: true,
      collectionFilter: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) },
      maxRetries: 3
    });

    await faultyWorker.processBatch();
    const retryingJob = await SyncQueue.findById(queueJobD._id);
    assert(retryingJob.status === 'pending', 'D1. Failed upload reverted to pending status for retry');
    assert(retryingJob.retryCount === 1, 'D2. Retry count incremented to 1');
    assert(retryingJob.errorDetails !== null, 'D3. Sanitized errorDetails recorded');

    // Restore live Atlas connection & process
    await worker.processBatch();
    const recoveredJobD = await SyncQueue.findById(queueJobD._id);
    assert(recoveredJobD.status === 'synced', 'D4. Job recovered and synced on live Atlas upon retry');

    const cloudDocD = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: retryVenue._id });
    assert(cloudDocD !== null, 'D5. Document verified in Atlas after successful recovery');

    // =========================================================================
    // Test E: Conflict Detection & Preservation
    // =========================================================================
    console.log('\n--- Test E: Conflict Detection & Preservation ---');
    const conflictDocId = new mongoose.Types.ObjectId();

    // 1. Pre-seed Atlas with newer version (v10)
    await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).insertOne({
      _id: conflictDocId,
      name: 'Cloud Master Venue',
      capacity: 5000,
      _syncVersion: 10
    });

    // 2. Local mutation attempting to upload an older version (v3)
    const staleJob = await syncQueueService.enqueueMutation({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: conflictDocId,
      operation: 'UPDATE',
      payload: { _id: conflictDocId, name: 'Local Outdated Venue', capacity: 100, _syncVersion: 3 },
      version: 3
    });

    await worker.processBatch();

    // Verify Atlas was NOT overwritten
    const atlasDocE = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: conflictDocId });
    assert(atlasDocE.name === 'Cloud Master Venue', 'E1. Atlas document was NOT overwritten by older version');
    assert(atlasDocE.capacity === 5000, 'E2. Atlas capacity preserved');
    assert(atlasDocE._syncVersion === 10, 'E3. Atlas version 10 maintained');

    // Verify Conflict Record in SyncConflict
    const conflictRecord = await SyncConflict.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: conflictDocId
    });
    assert(conflictRecord !== null, 'E4. Conflict record generated in syncconflicts');
    assert(conflictRecord.cloudVersion === 10, 'E5. Conflict captured cloudVersion 10');
    assert(conflictRecord.localVersion === 3, 'E6. Conflict captured localVersion 3');
    assert(conflictRecord.status === 'unresolved', 'E7. Conflict status is unresolved');

    const updatedStaleJob = await SyncQueue.findById(staleJob._id);
    assert(updatedStaleJob.status === 'conflict', 'E8. Queue job status updated to conflict');

    // =========================================================================
    // Test F: Dependency Ordering Across Atlas
    // =========================================================================
    console.log('\n--- Test F: Dependency Ordering Across Atlas ---');
    const parentEvent = await Phase32Event.create({
      title: 'Annual Tech Symposium'
    });

    const childReg = await Phase32Registration.create({
      studentName: 'Sathya Dev',
      event: parentEvent._id
    });

    const childQueueJob = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}registrations`,
      documentId: childReg._id
    });

    // Attempt to process child registration before parent event exists on Atlas
    // Test worker filter restricted only to registrations
    const childOnlyWorker = new SyncWorkerService({
      atlasConn: atlasTestDb,
      isAtlasConnected: () => true,
      enabled: true,
      enforceTestIsolation: true,
      collectionFilter: `${TEST_COLLECTION_PREFIX}registrations`
    });

    const childOnlyBatch = await childOnlyWorker.processBatch();
    assert(childOnlyBatch.deferred >= 1, 'F1. Child registration was deferred because parent event is not on Atlas');

    const checkChildBefore = await SyncQueue.findById(childQueueJob._id);
    assert(checkChildBefore.status === 'pending', 'F2. Child job remains pending');

    const cloudChildBefore = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}registrations`).findOne({ _id: childReg._id });
    assert(cloudChildBefore === null, 'F3. Child registration does NOT exist on Atlas yet (zero dangling foreign keys)');

    // Now process parent event to Atlas
    const eventWorker = new SyncWorkerService({
      atlasConn: atlasTestDb,
      isAtlasConnected: () => true,
      enabled: true,
      enforceTestIsolation: true,
      collectionFilter: `${TEST_COLLECTION_PREFIX}events`
    });

    await eventWorker.processBatch();
    const cloudEventAfter = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}events`).findOne({ _id: parentEvent._id });
    assert(cloudEventAfter !== null, 'F4. Parent event successfully uploaded to Atlas');

    // Process child registration now that parent is on Atlas
    await childOnlyWorker.processBatch();
    const checkChildAfter = await SyncQueue.findById(childQueueJob._id);
    assert(checkChildAfter.status === 'synced', 'F5. Child registration is now successfully synced');

    const cloudChildAfter = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}registrations`).findOne({ _id: childReg._id });
    assert(cloudChildAfter !== null, 'F6. Child registration verified on Atlas');
    assert(cloudChildAfter.event.toString() === parentEvent._id.toString(), 'F7. Foreign key relationship verified on Atlas');

    // =========================================================================
    // Test G: Offline Disconnection & Reconnection Flow
    // =========================================================================
    console.log('\n--- Test G: Offline Disconnection & Reconnection Flow ---');

    // 1. Simulate Atlas disconnection at the worker level
    const offlineWorker = new SyncWorkerService({
      atlasConn: atlasTestDb,
      isAtlasConnected: () => false, // Atlas disconnected
      enabled: true,
      enforceTestIsolation: true,
      collectionFilter: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) }
    });

    // 2. Perform write on local MongoDB while offline
    const offlineVenue = await Phase32Venue.create({
      name: 'Offline Generated Hall',
      capacity: 800,
      location: 'Basement Level'
    });
    assert(offlineVenue._id !== null, 'G1. Local write succeeded immediately on local MongoDB during offline state');

    // 3. Worker processBatch while offline
    const offlineBatchResult = await offlineWorker.processBatch();
    assert(offlineBatchResult.skipped === 'atlas_disconnected', 'G2. Worker detected offline state and skipped batch cleanly');
    assert(offlineBatchResult.processed === 0, 'G3. 0 jobs processed while offline');

    const offlineJob = await SyncQueue.findOne({
      collectionName: `${TEST_COLLECTION_PREFIX}venues`,
      documentId: offlineVenue._id
    });
    assert(offlineJob.status === 'pending', 'G4. Mutation remains safely persisted in SyncQueue');

    // 4. Reconnect to Atlas and allow worker to process
    const reconnectedWorker = new SyncWorkerService({
      atlasConn: atlasTestDb,
      isAtlasConnected: () => true, // Atlas reconnected
      enabled: true,
      enforceTestIsolation: true,
      collectionFilter: { $regex: new RegExp(`^${TEST_COLLECTION_PREFIX}`) }
    });

    const reconnectedBatch = await reconnectedWorker.processBatch();
    assert(reconnectedBatch.synced >= 1, 'G5. Pending mutations synchronized immediately upon Atlas reconnection');

    const cloudDocG = await atlasTestDb.collection(`${TEST_COLLECTION_PREFIX}venues`).findOne({ _id: offlineVenue._id });
    assert(cloudDocG !== null, 'G6. Offline created document verified on MongoDB Atlas');
    assert(cloudDocG.name === 'Offline Generated Hall', 'G7. Offline payload verified on Atlas');

    console.log('\n====================================================');
    console.log(`PHASE 3.2 E2E SUITE: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================\n');
  } finally {
    await teardown();
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal error in Phase 3.2 E2E suite:', err);
  process.exit(1);
});
