require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

// Ensure tests strictly execute against local database
process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/festflow';

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Venue = require('../src/models/Venue');
const Club = require('../src/models/Club');
const Registration = require('../src/models/Registration');
const ClubMembership = require('../src/models/ClubMembership');
const SyncQueue = require('../src/models/SyncQueue');
const SyncTombstone = require('../src/models/SyncTombstone');
const SyncConflict = require('../src/models/SyncConflict');
const syncQueueService = require('../src/services/syncQueueService');
const syncReconciliationService = require('../src/services/syncReconciliationService');

const runPhase2Tests = async () => {
  console.log('🧪 Starting Dedicated Phase 2 Persistent SyncQueue Test Suite...');

  await connectDB();

  // Safety confirmation: ensure connected to local database
  if (!mongoose.connection.host.includes('127.0.0.1') && !mongoose.connection.host.includes('localhost')) {
    console.error('⛔ SAFETY ABORT: Tests must only run against Local MongoDB! Host was:', mongoose.connection.host);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // Clean up any test-specific artifacts from sync metadata
    await SyncQueue.deleteMany({ collectionName: { $in: ['test_users', 'venues', 'clubs', 'events', 'registrations'] } });
    await SyncTombstone.deleteMany({ collectionName: { $in: ['test_users', 'venues', 'clubs', 'events', 'registrations'] } });
    await SyncConflict.deleteMany({ collectionName: { $in: ['test_users', 'venues', 'clubs', 'events', 'registrations'] } });

    // Ensure we have a test venue and club
    let testVenue = await Venue.findOne({ name: 'SyncTest Arena' });
    if (!testVenue) {
      testVenue = await Venue.create({
        name: 'SyncTest Arena',
        location: 'Block S-Phase2',
        capacity: 250,
        venueType: 'Seminar Hall'
      });
    }

    // --- TEST 1: Model.create() capture ---
    console.log('\n--- Test 1: Model.create() capture ---');
    const createdVenue = await Venue.create({
      name: `SyncTest Venue ${Date.now()}`,
      location: 'Block V-101',
      capacity: 100,
      venueType: 'Lab'
    });

    const createJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: createdVenue._id,
      operation: 'CREATE'
    });

    assert(createJob !== null, '1a. Model.create() generated a SyncQueue job');
    assert(createJob?.status === 'pending', '1b. Job status is "pending"');
    assert(createJob?.version === 1, '1c. Initial version is 1');
    assert(createJob?.idempotencyKey.includes(':v1:CREATE'), '1d. Idempotency key contains version and operation');
    assert(createJob?.payload?.name === createdVenue.name, '1e. Payload snapshot matches created document');

    // --- TEST 2: Document.save() on existing doc ---
    console.log('\n--- Test 2: doc.save() on existing document ---');
    createdVenue.capacity = 150;
    await createdVenue.save();

    const saveUpdateJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: createdVenue._id,
      operation: 'UPDATE',
      version: 2
    });

    assert(saveUpdateJob !== null, '2a. doc.save() generated an UPDATE SyncQueue job');
    assert(saveUpdateJob?.version === 2, '2b. Incremented version to 2');
    assert(saveUpdateJob?.payload?.capacity === 150, '2c. Payload contains updated capacity');

    // --- TEST 3: findByIdAndUpdate() capture ---
    console.log('\n--- Test 3: Model.findByIdAndUpdate() capture ---');
    await Venue.findByIdAndUpdate(createdVenue._id, { location: 'Block V-Updated' });

    const findByIdUpdateJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: createdVenue._id,
      operation: 'UPDATE',
      version: 3
    });

    assert(findByIdUpdateJob !== null, '3a. findByIdAndUpdate() generated an UPDATE SyncQueue job');
    assert(findByIdUpdateJob?.version === 3, '3b. Incremented version to 3');
    assert(findByIdUpdateJob?.payload?.location === 'Block V-Updated', '3c. Payload reflects updated location');

    // --- TEST 4: findOneAndUpdate() capture ---
    console.log('\n--- Test 4: Model.findOneAndUpdate() capture ---');
    await Venue.findOneAndUpdate({ _id: createdVenue._id }, { capacity: 200 });

    const findOneUpdateJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: createdVenue._id,
      operation: 'UPDATE',
      version: 4
    });

    assert(findOneUpdateJob !== null, '4a. findOneAndUpdate() generated an UPDATE SyncQueue job');
    assert(findOneUpdateJob?.version === 4, '4b. Incremented version to 4');
    assert(findOneUpdateJob?.payload?.capacity === 200, '4c. Payload reflects updated capacity');

    // --- TEST 5: Document.deleteOne() capture & Tombstone ---
    console.log('\n--- Test 5: doc.deleteOne() capture and Tombstone ---');
    const venueToDelete = await Venue.create({
      name: `Tombstone Test ${Date.now()}`,
      location: 'Block T-1',
      capacity: 50,
      venueType: 'Classroom'
    });

    await venueToDelete.deleteOne();

    const deleteJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: venueToDelete._id,
      operation: 'DELETE'
    });

    const tombstone = await SyncTombstone.findOne({
      collectionName: 'venues',
      documentId: venueToDelete._id
    });

    assert(deleteJob !== null, '5a. doc.deleteOne() generated a DELETE SyncQueue job');
    assert(deleteJob?.status === 'pending', '5b. DELETE job status is "pending"');
    assert(tombstone !== null, '5c. Persistent deletion tombstone created in sync_tombstones');
    assert(tombstone?.documentId.toString() === venueToDelete._id.toString(), '5d. Tombstone preserves original ObjectId');

    // --- TEST 6: findOneAndDelete() capture & Tombstone ---
    console.log('\n--- Test 6: Model.findOneAndDelete() capture and Tombstone ---');
    const venueToFindDelete = await Venue.create({
      name: `FindDelete Test ${Date.now()}`,
      location: 'Block FD-1',
      capacity: 60,
      venueType: 'Classroom'
    });

    await Venue.findOneAndDelete({ _id: venueToFindDelete._id });

    const findDeleteJob = await SyncQueue.findOne({
      collectionName: 'venues',
      documentId: venueToFindDelete._id,
      operation: 'DELETE'
    });

    const findDeleteTombstone = await SyncTombstone.findOne({
      collectionName: 'venues',
      documentId: venueToFindDelete._id
    });

    assert(findDeleteJob !== null, '6a. findOneAndDelete() generated a DELETE SyncQueue job');
    assert(findDeleteTombstone !== null, '6b. findOneAndDelete() recorded deletion tombstone');

    // --- TEST 7: deleteMany() capture & Batch Tombstones ---
    console.log('\n--- Test 7: Model.deleteMany() capture and Batch Tombstones ---');
    const batchTag = `batch_${Date.now()}`;
    const v1 = await Venue.create({ name: `Batch 1 ${batchTag}`, location: batchTag, capacity: 10, venueType: 'Lab' });
    const v2 = await Venue.create({ name: `Batch 2 ${batchTag}`, location: batchTag, capacity: 20, venueType: 'Lab' });

    await Venue.deleteMany({ location: batchTag });

    const batchDeleteJobs = await SyncQueue.find({
      collectionName: 'venues',
      documentId: { $in: [v1._id, v2._id] },
      operation: 'DELETE'
    });

    const batchTombstones = await SyncTombstone.find({
      collectionName: 'venues',
      documentId: { $in: [v1._id, v2._id] }
    });

    assert(batchDeleteJobs.length === 2, '7a. deleteMany() captured individual DELETE jobs for all matched documents');
    assert(batchTombstones.length === 2, '7b. deleteMany() created persistent tombstones for all matched documents');

    // --- TEST 8: Duplicate Prevention via Idempotency Key ---
    console.log('\n--- Test 8: Duplicate Prevention via Idempotency Key ---');
    const existingCount = await SyncQueue.countDocuments({ idempotencyKey: createJob.idempotencyKey });
    assert(existingCount === 1, '8a. Exactly one entry exists for initial idempotency key');

    // Attempt to re-enqueue exact same mutation
    await syncQueueService.enqueueMutation({
      collectionName: createJob.collectionName,
      documentId: createJob.documentId,
      operation: createJob.operation,
      payload: createJob.payload,
      version: createJob.version
    });

    const countAfterReEnqueue = await SyncQueue.countDocuments({ idempotencyKey: createJob.idempotencyKey });
    assert(countAfterReEnqueue === 1, '8b. Re-enqueueing identical mutation did not create duplicate job (count remains 1)');

    // --- TEST 9: Crash Recovery Reconciliation ---
    console.log('\n--- Test 9: Crash Recovery Reconciliation ---');
    // Simulate a write where the queue job was lost/failed
    const unqueuedVenue = await Venue.create({
      name: `Unqueued Venue ${Date.now()}`,
      location: 'Block Crash-Recovery',
      capacity: 88,
      venueType: 'Lab'
    });

    // Manually delete its queue entry to simulate a crash before queue insertion
    await SyncQueue.deleteMany({ documentId: unqueuedVenue._id });
    const beforeReconciliation = await SyncQueue.findOne({ documentId: unqueuedVenue._id });
    assert(beforeReconciliation === null, '9a. Simulated crash: document exists without queue job');

    // Run reconciliation
    const reconSummary = await syncReconciliationService.reconcileAll();
    const afterReconciliation = await SyncQueue.findOne({ documentId: unqueuedVenue._id });

    assert(reconSummary.mutationsEnqueued >= 1, '9b. Reconciler reported recovered mutations');
    assert(afterReconciliation !== null, '9c. Reconciler recovered missing mutation into SyncQueue');
    assert(afterReconciliation?.status === 'pending', '9d. Recovered job status is "pending"');

    // --- TEST 10: Idempotency of Reconciliation (No Endless Duplicate Jobs) ---
    console.log('\n--- Test 10: Idempotency of Reconciliation ---');
    const totalJobsBeforeSecondRecon = await SyncQueue.countDocuments();
    const secondReconSummary = await syncReconciliationService.reconcileAll();
    const totalJobsAfterSecondRecon = await SyncQueue.countDocuments();

    assert(secondReconSummary.mutationsEnqueued === 0, '10a. Second reconciliation found 0 missing mutations');
    assert(totalJobsBeforeSecondRecon === totalJobsAfterSecondRecon, '10b. Job count unchanged after repeated reconciliation');

    // --- TEST 11: Retry Behavior & Status Tracking ---
    console.log('\n--- Test 11: Retry Behavior and Status Tracking ---');
    const jobToRetry = await SyncQueue.findOne({ status: 'pending' });
    assert(jobToRetry !== null, '11a. Found pending job for retry test');

    const initialRetryCount = jobToRetry.retryCount || 0;
    await syncQueueService.updateJobStatus(jobToRetry._id, 'failed', 'Simulated network timeout 503');
    const failedJob = await SyncQueue.findById(jobToRetry._id);

    assert(failedJob?.status === 'failed', '11b. Job status transitioned to "failed"');
    assert(failedJob?.retryCount === initialRetryCount + 1, `11c. Retry count incremented from ${initialRetryCount} to ${initialRetryCount + 1}`);
    assert(failedJob?.errorDetails === 'Simulated network timeout 503', '11d. Error details persisted');

    // Reset back to pending
    await syncQueueService.updateJobStatus(jobToRetry._id, 'pending');

    // --- TEST 12: Conflict Recording ---
    console.log('\n--- Test 12: Conflict Recording ---');
    const conflictVenue = await Venue.create({
      name: `Conflict Venue ${Date.now()}`,
      location: 'Block Conflict',
      capacity: 99,
      venueType: 'Lab'
    });

    const recordedConflict = await syncQueueService.recordConflict({
      collectionName: 'venues',
      documentId: conflictVenue._id,
      localVersion: 1,
      cloudVersion: 3,
      localPayload: { capacity: 99 },
      cloudPayload: { capacity: 300, updatedAt: new Date() },
      conflictReason: 'Cloud document has newer revision (v3 > v1)'
    });

    const conflictDoc = await SyncConflict.findById(recordedConflict._id);
    const conflictJob = await SyncQueue.findOne({ documentId: conflictVenue._id });

    assert(conflictDoc !== null, '12a. Conflict record created in sync_conflicts');
    assert(conflictDoc?.status === 'unresolved', '12b. Conflict status is "unresolved"');
    assert(conflictDoc?.cloudVersion === 3, '12c. Cloud version preserved');
    assert(conflictJob?.status === 'conflict', '12d. Queue job status updated to "conflict"');

    // --- TEST 13: Queue Statistics Reporting ---
    console.log('\n--- Test 13: Queue Statistics Reporting ---');
    const stats = await syncQueueService.getQueueStats();
    assert(stats.total > 0, '13a. Total queue items > 0');
    assert(stats.pending >= 0, '13b. Pending count reported');
    assert(stats.tombstones >= 1, '13c. Tombstone count reported');
    assert(stats.unresolvedConflicts >= 1, '13d. Unresolved conflicts reported');

    // Clean up temporary test venues
    await Venue.deleteMany({ name: /SyncTest|Tombstone|FindDelete|Batch|Unqueued|Conflict/ });
    await SyncQueue.deleteMany({ collectionName: 'venues' });
    await SyncTombstone.deleteMany({ collectionName: 'venues' });
    await SyncConflict.deleteMany({ collectionName: 'venues' });

    console.log('\n====================================================');
    console.log(`PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================');

    await connectDB.closeAll();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Phase 2 test suite execution error:', err);
    await connectDB.closeAll();
    process.exit(1);
  }
};

runPhase2Tests();
