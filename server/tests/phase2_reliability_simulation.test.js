require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

// Ensure tests strictly execute against local database
process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/festflow';

const Venue = require('../src/models/Venue');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const SyncQueue = require('../src/models/SyncQueue');
const SyncTombstone = require('../src/models/SyncTombstone');
const SyncConflict = require('../src/models/SyncConflict');
const syncQueueService = require('../src/services/syncQueueService');
const syncReconciliationService = require('../src/services/syncReconciliationService');

const runReliabilitySuite = async () => {
  console.log('🧪 Starting Phase 2 Edge-Case, Concurrency & Crash Simulation Suite...\n');

  await connectDB();

  if (!mongoose.connection.host.includes('127.0.0.1') && !mongoose.connection.host.includes('localhost')) {
    console.error('⛔ SAFETY ABORT: Tests must only run against Local MongoDB! Host:', mongoose.connection.host);
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
    // Clean up test metadata
    await SyncQueue.deleteMany({ collectionName: 'venues' });
    await SyncTombstone.deleteMany({ collectionName: 'venues' });
    await SyncConflict.deleteMany({ collectionName: 'venues' });
    await Venue.deleteMany({ name: /SimTest/ });

    // =========================================================================
    // SECTION 1: Exact Execution Order & Crash Between Delete and Tombstone
    // =========================================================================
    console.log('--- SECTION 1: Exact Execution Order & Deletion Crash Simulation ---');

    // 1a. Verify Write-Ahead Tombstone (WAT) execution order
    const v1 = await Venue.create({
      name: `SimTest WAT ${Date.now()}`,
      location: 'Block WAT-1',
      capacity: 50,
      venueType: 'Lab'
    });

    // Inspect execution order: In our implementation:
    // 1. pre('deleteOne') fires -> persistWriteAheadTombstone writes to SyncTombstone
    // 2. MongoDB executes physical collection delete
    // 3. post('deleteOne') fires -> enqueueMutation enqueues DELETE job into SyncQueue
    await v1.deleteOne();

    const watTombstone = await SyncTombstone.findOne({ collectionName: 'venues', documentId: v1._id });
    const watQueueJob = await SyncQueue.findOne({ collectionName: 'venues', documentId: v1._id, operation: 'DELETE' });

    assert(watTombstone !== null, '1a. Write-Ahead Tombstone successfully written to disk');
    assert(watQueueJob !== null, '1b. DELETE job enqueued in SyncQueue');

    // 1b. Simulate Crash: Document deleted, Write-Ahead Tombstone on disk, but post-hook queue insert crashed
    console.log('\n--- Simulating crash after physical delete before queue insertion ---');
    const vCrash = await Venue.create({
      name: `SimTest Crash ${Date.now()}`,
      location: 'Block Crash-1',
      capacity: 75,
      venueType: 'Lab'
    });

    // Write tombstone ahead of time (as pre-hook does)
    await SyncTombstone.create({
      collectionName: 'venues',
      documentId: vCrash._id,
      version: 2,
      deletedAt: new Date()
    });

    // Physically delete document directly in MongoDB (simulating delete occurred)
    await Venue.collection.deleteOne({ _id: vCrash._id });

    // Verify state before reconciliation: doc is gone, tombstone exists, SyncQueue DELETE job is MISSING
    const beforeReconJob = await SyncQueue.findOne({ documentId: vCrash._id, operation: 'DELETE' });
    assert(beforeReconJob === null, '1c. Simulated crash: document deleted, queue job missing');

    // Run reconciliation on simulated crash state
    const recon1 = await syncReconciliationService.reconcileAll();
    const afterReconJob = await SyncQueue.findOne({ documentId: vCrash._id, operation: 'DELETE' });

    assert(afterReconJob !== null, '1d. Reconciler detected orphaned tombstone and recovered DELETE job');
    assert(afterReconJob?.status === 'pending', '1e. Recovered DELETE job status is "pending"');

    // =========================================================================
    // SECTION 2: Crash Simulation During deleteMany() Processing
    // =========================================================================
    console.log('\n--- SECTION 2: Crash Simulation During deleteMany() Processing ---');
    const batchTag = `SimTest_Batch_${Date.now()}`;
    const b1 = await Venue.create({ name: `Batch A ${batchTag}`, location: batchTag, capacity: 10, venueType: 'Lab' });
    const b2 = await Venue.create({ name: `Batch B ${batchTag}`, location: batchTag, capacity: 20, venueType: 'Lab' });
    const b3 = await Venue.create({ name: `Batch C ${batchTag}`, location: batchTag, capacity: 30, venueType: 'Lab' });

    // Execute deleteMany which records tombstones and enqueues jobs
    await Venue.deleteMany({ location: batchTag });

    // Now simulate that the process crashed mid-way during queue creation:
    // Artificially remove the DELETE jobs for b2 and b3, but keep their tombstones
    await SyncQueue.deleteMany({ documentId: { $in: [b2._id, b3._id] }, operation: 'DELETE' });

    const b2MissingBefore = await SyncQueue.findOne({ documentId: b2._id, operation: 'DELETE' });
    const b3MissingBefore = await SyncQueue.findOne({ documentId: b3._id, operation: 'DELETE' });
    assert(b2MissingBefore === null && b3MissingBefore === null, '2a. Simulated crash during deleteMany queue writes');

    // Run reconciliation
    const reconBatch = await syncReconciliationService.reconcileAll();
    const b2Recovered = await SyncQueue.findOne({ documentId: b2._id, operation: 'DELETE' });
    const b3Recovered = await SyncQueue.findOne({ documentId: b3._id, operation: 'DELETE' });
    const b1Job = await SyncQueue.find({ documentId: b1._id, operation: 'DELETE' });

    assert(b2Recovered !== null, '2b. Reconciler recovered missing DELETE job for b2');
    assert(b3Recovered !== null, '2c. Reconciler recovered missing DELETE job for b3');
    assert(b1Job.length === 1, '2d. Reconciler did NOT duplicate already existing b1 DELETE job');

    // =========================================================================
    // SECTION 3: Consecutive Saves, Concurrent Updates & Version Invariants
    // =========================================================================
    console.log('\n--- SECTION 3: Consecutive Saves, Concurrent Updates & Versioning ---');
    const vConsecutive = await Venue.create({
      name: `SimTest Versioning ${Date.now()}`,
      location: 'Block V-Init',
      capacity: 10,
      venueType: 'Lab'
    });

    assert(vConsecutive._syncVersion === 1, '3a. Initial version after create is 1');

    // 5 Consecutive saves
    for (let i = 2; i <= 6; i++) {
      vConsecutive.capacity = 10 * i;
      await vConsecutive.save();
      assert(vConsecutive._syncVersion === i, `3b.${i} Consecutive save ${i - 1} produced _syncVersion = ${i}`);
    }

    // Verify all 5 UPDATE jobs were queued with sequential versions
    const allJobs = await SyncQueue.find({ documentId: vConsecutive._id }).sort({ version: 1 });
    assert(allJobs.length === 6, '3c. Total jobs for document is 6 (1 CREATE + 5 UPDATEs)');
    const versions = allJobs.map((j) => j.version);
    assert(JSON.stringify(versions) === JSON.stringify([1, 2, 3, 4, 5, 6]), '3d. Monotonically increasing versions [1, 2, 3, 4, 5, 6]');

    // Concurrent updates test
    console.log('\n--- Concurrent Updates Test ---');
    const vConcurrent = await Venue.create({
      name: `SimTest Concurrency ${Date.now()}`,
      location: 'Block Conc-Init',
      capacity: 100,
      venueType: 'Lab'
    });

    // Fire 4 concurrent findByIdAndUpdate queries
    await Promise.all([
      Venue.findByIdAndUpdate(vConcurrent._id, { location: 'Block Conc-A' }),
      Venue.findByIdAndUpdate(vConcurrent._id, { location: 'Block Conc-B' }),
      Venue.findByIdAndUpdate(vConcurrent._id, { location: 'Block Conc-C' }),
      Venue.findByIdAndUpdate(vConcurrent._id, { location: 'Block Conc-D' })
    ]);

    const freshConcurrent = await Venue.findById(vConcurrent._id);
    assert(freshConcurrent._syncVersion === 5, '3e. 4 concurrent atomic updates incremented version to 5');

    // =========================================================================
    // SECTION 4: Process Termination (SIGKILL) & Cold Restart Recovery
    // =========================================================================
    console.log('\n--- SECTION 4: Child Process Termination & Restart Recovery ---');

    // Create a child script that writes to local MongoDB and terminates immediately
    const childWorkerCode = `
      require('dotenv').config();
      process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/festflow';
      const connectDB = require('../src/config/db');
      const Venue = require('../src/models/Venue');
      const SyncQueue = require('../src/models/SyncQueue');

      (async () => {
        try {
          await connectDB();
          const vChild = await Venue.create({
            name: 'SimTest KilledProcess ' + Date.now(),
            location: 'Block CrashProcess',
            capacity: 999,
            venueType: 'Lab'
          });
          // Abruptly delete the queue job to simulate kill before outbox write completed
          await SyncQueue.deleteMany({ documentId: vChild._id });
          console.log('CHILD_CREATED:' + vChild._id);
          // Abrupt exit with code 137 (SIGKILL equivalent)
          process.exit(137);
        } catch (e) {
          console.error('CHILD_ERROR:', e.message);
          process.exit(1);
        }
      })();
    `;

    const fs = require('fs');
    const childScriptPath = path.join(__dirname, 'temp_crash_worker.js');
    fs.writeFileSync(childScriptPath, childWorkerCode);

    let childCreatedId = null;
    let childStderr = '';
    const childExitCode = await new Promise((resolve) => {
      const child = fork(childScriptPath, [], { silent: true });
      child.stdout.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/CHILD_CREATED:([a-f0-9]{24})/);
        if (match) childCreatedId = match[1];
      });
      child.stderr.on('data', (data) => {
        childStderr += data.toString();
      });
      child.on('exit', (code) => {
        resolve(code);
      });
    });

    if (childStderr) {
      console.log('Child stderr output:', childStderr.trim());
    }

    try { fs.unlinkSync(childScriptPath); } catch (_) {}

    assert(childExitCode === 137, '4a. Child process exited with abrupt termination code 137');
    assert(childCreatedId !== null, `4b. Child process committed document to local MongoDB (ID: ${childCreatedId})`);

    // Verify document exists in local DB but queue job was lost due to termination
    const childDocInDb = await Venue.findById(childCreatedId);
    const childJobBeforeRecon = await SyncQueue.findOne({ documentId: childCreatedId });
    assert(childDocInDb !== null, '4c. Local document exists in local MongoDB');
    assert(childJobBeforeRecon === null, '4d. Queue job was lost due to process termination');

    // Simulate backend restart: run full reconciliation
    const restartRecon = await syncReconciliationService.reconcileAll();
    const childJobAfterRecon = await SyncQueue.findOne({ documentId: childCreatedId });

    assert(restartRecon.mutationsEnqueued >= 1, '4e. Cold restart reconciler recovered mutations');
    assert(childJobAfterRecon !== null, '4f. Recovered mutation successfully enqueued into SyncQueue');
    assert(childJobAfterRecon?.operation === 'CREATE', '4g. Operation correctly identified as CREATE');
    assert(childJobAfterRecon?.version === childDocInDb._syncVersion, '4h. Version matches document version');

    // Clean up test data
    await Venue.deleteMany({ name: /SimTest/ });
    await SyncQueue.deleteMany({ collectionName: 'venues' });
    await SyncTombstone.deleteMany({ collectionName: 'venues' });
    await SyncConflict.deleteMany({ collectionName: 'venues' });

    console.log('\n====================================================');
    console.log(`RELIABILITY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================\n');

    await connectDB.closeAll();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Reliability suite execution error:', err);
    await connectDB.closeAll();
    process.exit(1);
  }
};

runReliabilitySuite();
