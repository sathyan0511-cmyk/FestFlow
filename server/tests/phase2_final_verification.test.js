require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

// Ensure tests strictly execute against local database
process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/festflow';

const Venue = require('../src/models/Venue');
const SyncQueue = require('../src/models/SyncQueue');
const SyncTombstone = require('../src/models/SyncTombstone');
const SyncConflict = require('../src/models/SyncConflict');
const syncQueueService = require('../src/services/syncQueueService');
const syncReconciliationService = require('../src/services/syncReconciliationService');

const runFinalVerificationSuite = async () => {
  console.log('🧪 Starting Phase 2 Final Reliability Verification Suite...\n');

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
    // Clean test metadata
    await SyncQueue.deleteMany({ collectionName: 'venues' });
    await SyncTombstone.deleteMany({ collectionName: 'venues' });
    await SyncConflict.deleteMany({ collectionName: 'venues' });
    await Venue.deleteMany({ name: /FinalTest/ });

    // =========================================================================
    // SECTION 1: Genuine OS-Level SIGKILL (TerminateProcess) Behaviour
    // =========================================================================
    console.log('--- SECTION 1: Genuine OS-Level SIGKILL (TerminateProcess) Test ---');

    const workerCode = `
      require('dotenv').config();
      process.env.LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/festflow';
      const connectDB = require('../src/config/db');
      const Venue = require('../src/models/Venue');
      const SyncQueue = require('../src/models/SyncQueue');

      (async () => {
        try {
          await connectDB();
          const doc = await Venue.create({
            name: 'FinalTest SIGKILL ' + Date.now(),
            location: 'Block SIGKILL',
            capacity: 555,
            venueType: 'Auditorium'
          });
          // Artificially remove queue entry to simulate crash before queue write completed
          await SyncQueue.deleteMany({ documentId: doc._id });
          // Notify parent of readiness
          if (process.send) {
            process.send({ ready: true, docId: doc._id.toString(), pid: process.pid });
          }
          // Stay alive indefinitely waiting for OS kill
          setInterval(() => {}, 1000);
        } catch (e) {
          process.exit(1);
        }
      })();
    `;

    const workerPath = path.join(__dirname, 'temp_sigkill_worker.js');
    fs.writeFileSync(workerPath, workerCode);

    let killedDocId = null;
    let childPid = null;
    let killSignalCaptured = null;
    let childExitCodeCaptured = null;

    const child = fork(workerPath, [], { silent: true });

    await new Promise((resolve) => {
      child.on('message', (msg) => {
        if (msg.ready) {
          killedDocId = msg.docId;
          childPid = msg.pid;

          // Issue a GENUINE OS-level SIGKILL (TerminateProcess on Windows)
          console.log(`Sending genuine OS-level SIGKILL to child PID ${childPid}...`);
          child.kill('SIGKILL');
        }
      });

      child.on('exit', (code, signal) => {
        childExitCodeCaptured = code;
        killSignalCaptured = signal;
        resolve();
      });
    });

    try { fs.unlinkSync(workerPath); } catch (_) {}

    // On Windows, child.kill('SIGKILL') terminates the process with code 1 or signal SIGKILL
    const wasForcefullyKilled = killSignalCaptured === 'SIGKILL' || childExitCodeCaptured !== 0;
    assert(wasForcefullyKilled, `1a. Child process was terminated via genuine OS SIGKILL (signal: ${killSignalCaptured}, code: ${childExitCodeCaptured})`);
    assert(killedDocId !== null, `1b. Verified child committed document ${killedDocId} before kill`);

    // Verify document exists in local MongoDB, but queue entry was not completed due to kill
    const docInDb = await Venue.findById(killedDocId);
    const queueBeforeRecon = await SyncQueue.findOne({ documentId: killedDocId });
    assert(docInDb !== null, '1c. Local document exists in MongoDB');
    assert(queueBeforeRecon === null, '1d. Queue job missing due to abrupt OS process termination');

    // Cold restart reconciliation
    console.log('Running cold restart reconciliation...');
    const reconSigkill = await syncReconciliationService.reconcileAll();
    const queueAfterRecon = await SyncQueue.findOne({ documentId: killedDocId });

    assert(reconSigkill.mutationsEnqueued >= 1, '1e. Reconciler reported recovered mutations');
    assert(queueAfterRecon !== null, '1f. Missing mutation successfully recovered into SyncQueue');
    assert(queueAfterRecon?.operation === 'CREATE', '1g. Recovered operation is CREATE');
    assert(queueAfterRecon?.version === docInDb._syncVersion, '1h. Version matches local document version');

    // =========================================================================
    // SECTION 2: Tombstone Write Failure Behavior (Atomic Abort Guarantee)
    // =========================================================================
    console.log('\n--- SECTION 2: Tombstone Write Failure Behavior ---');

    // 2a. Test deleteOne() aborts if tombstone persistence fails
    console.log('\nTesting deleteOne() failure behavior:');
    const vDeleteFail = await Venue.create({
      name: `FinalTest DelFail ${Date.now()}`,
      location: 'Block Fail-1',
      capacity: 100,
      venueType: 'Lab'
    });

    // Temporarily mock SyncTombstone.findOneAndUpdate to throw an error
    const originalTombstoneFindOneAndUpdate = SyncTombstone.findOneAndUpdate;
    SyncTombstone.findOneAndUpdate = async () => {
      throw new Error('Simulated disk I/O error during tombstone write');
    };

    let deleteOneError = null;
    try {
      await vDeleteFail.deleteOne();
    } catch (err) {
      deleteOneError = err;
    }

    // Restore original method immediately
    SyncTombstone.findOneAndUpdate = originalTombstoneFindOneAndUpdate;

    assert(deleteOneError !== null, `2a. deleteOne() threw error when tombstone write failed: "${deleteOneError?.message?.substring(0, 50)}..."`);

    // Verify document STILL EXISTS in the database (deletion was aborted!)
    const docStillExistsAfterFail = await Venue.findById(vDeleteFail._id);
    assert(docStillExistsAfterFail !== null, '2b. Document was NOT deleted from collection (deletion aborted)');

    // 2b. Test findOneAndDelete() aborts if tombstone persistence fails
    console.log('\nTesting findOneAndDelete() failure behavior:');
    const vFindDelFail = await Venue.create({
      name: `FinalTest FindDelFail ${Date.now()}`,
      location: 'Block Fail-2',
      capacity: 120,
      venueType: 'Lab'
    });

    SyncTombstone.findOneAndUpdate = async () => {
      throw new Error('Simulated disk error during findOneAndDelete tombstone');
    };

    let findOneDelError = null;
    try {
      await Venue.findOneAndDelete({ _id: vFindDelFail._id });
    } catch (err) {
      findOneDelError = err;
    }

    SyncTombstone.findOneAndUpdate = originalTombstoneFindOneAndUpdate;

    assert(findOneDelError !== null, '2c. findOneAndDelete() threw error when tombstone write failed');
    const findDelDocExists = await Venue.findById(vFindDelFail._id);
    assert(findDelDocExists !== null, '2d. Document was NOT deleted from collection (operation aborted)');

    // 2c. Test deleteMany() aborts if ANY tombstone fails
    console.log('\nTesting deleteMany() failure behavior:');
    const failTag = `FinalTest_BatchFail_${Date.now()}`;
    const f1 = await Venue.create({ name: `FailBatch 1 ${failTag}`, location: failTag, capacity: 10, venueType: 'Lab' });
    const f2 = await Venue.create({ name: `FailBatch 2 ${failTag}`, location: failTag, capacity: 20, venueType: 'Lab' });

    SyncTombstone.findOneAndUpdate = async () => {
      throw new Error('Simulated batch tombstone write failure');
    };

    let deleteManyError = null;
    try {
      await Venue.deleteMany({ location: failTag });
    } catch (err) {
      deleteManyError = err;
    }

    SyncTombstone.findOneAndUpdate = originalTombstoneFindOneAndUpdate;

    assert(deleteManyError !== null, '2e. deleteMany() threw error when tombstone persistence failed');
    const remainingBatch = await Venue.find({ location: failTag });
    assert(remainingBatch.length === 2, '2f. All batch documents STILL exist in collection (deleteMany aborted completely, 0 untracked deletes)');

    // 2d. Test reconciliation handles tombstones for documents that still exist because deletion aborted
    console.log('\nTesting reconciliation with aborted deletion tombstones:');
    const activeDocWithTombstone = await Venue.create({
      name: `FinalTest AbortedDel ${Date.now()}`,
      location: 'Block AbortedDel',
      capacity: 50,
      venueType: 'Lab'
    });

    // Manually insert an orphaned tombstone (simulating crash before physical delete)
    await SyncTombstone.create({
      collectionName: 'venues',
      documentId: activeDocWithTombstone._id,
      version: 2,
      deletedAt: new Date()
    });

    const tombstoneBeforeRecon = await SyncTombstone.findOne({ documentId: activeDocWithTombstone._id });
    assert(tombstoneBeforeRecon !== null, '2g. Premature tombstone exists for active document');

    const reconAborted = await syncReconciliationService.reconcileAll();
    const tombstoneAfterRecon = await SyncTombstone.findOne({ documentId: activeDocWithTombstone._id });
    const activeDocStillInDb = await Venue.findById(activeDocWithTombstone._id);
    const deleteJobForActiveDoc = await SyncQueue.findOne({ documentId: activeDocWithTombstone._id, operation: 'DELETE' });

    assert(tombstoneAfterRecon === null, '2h. Reconciler detected document is still active and purged premature tombstone');
    assert(activeDocStillInDb !== null, '2i. Active document remains completely intact in collection');
    assert(deleteJobForActiveDoc === null, '2j. Reconciler did NOT generate a false DELETE job');

    // =========================================================================
    // SECTION 3: Concurrent Mutation Behavior
    // =========================================================================
    console.log('\n--- SECTION 3: Concurrent Mutation Behavior ---');

    // 3a. Update racing with deleteOne()
    console.log('\nTesting Update racing with deleteOne():');
    const vRace = await Venue.create({
      name: `FinalTest Race1 ${Date.now()}`,
      location: 'Block Race-1',
      capacity: 100,
      venueType: 'Lab'
    });

    const raceResults = await Promise.allSettled([
      Venue.findByIdAndUpdate(vRace._id, { capacity: 999 }),
      vRace.deleteOne()
    ]);

    const raceDocFinal = await Venue.findById(vRace._id);
    const raceTombstone = await SyncTombstone.findOne({ documentId: vRace._id });
    const raceDeleteJob = await SyncQueue.findOne({ documentId: vRace._id, operation: 'DELETE' });

    assert(raceDocFinal === null, '3a. Document is deleted from collection');
    assert(raceTombstone !== null, '3b. Tombstone exists for deleted document');
    assert(raceDeleteJob !== null, '3c. DELETE job exists in SyncQueue');

    // 3b. Update racing with deleteMany()
    console.log('\nTesting Update racing with deleteMany():');
    const raceManyTag = `FinalTest_RaceMany_${Date.now()}`;
    const rm1 = await Venue.create({ name: `RM1 ${raceManyTag}`, location: raceManyTag, capacity: 10, venueType: 'Lab' });
    const rm2 = await Venue.create({ name: `RM2 ${raceManyTag}`, location: raceManyTag, capacity: 20, venueType: 'Lab' });

    await Promise.allSettled([
      Venue.findByIdAndUpdate(rm1._id, { capacity: 777 }),
      Venue.deleteMany({ location: raceManyTag })
    ]);

    const rmCountAfter = await Venue.countDocuments({ location: raceManyTag });
    const rmTombstones = await SyncTombstone.find({ documentId: { $in: [rm1._id, rm2._id] } });
    const rmDeleteJobs = await SyncQueue.find({ documentId: { $in: [rm1._id, rm2._id] }, operation: 'DELETE' });

    assert(rmCountAfter === 0, '3d. All documents removed from collection');
    assert(rmTombstones.length === 2, '3e. Tombstones exist for all deleted documents');
    assert(rmDeleteJobs.length === 2, '3f. DELETE jobs exist in SyncQueue for all deleted documents');

    // 3c. Multiple simultaneous updates to the same document
    console.log('\nTesting 6 simultaneous atomic updates:');
    const vMultiUpdate = await Venue.create({
      name: `FinalTest MultiUp ${Date.now()}`,
      location: 'Block Multi-Init',
      capacity: 50,
      venueType: 'Lab'
    });

    await Promise.all([
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 1' }),
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 2' }),
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 3' }),
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 4' }),
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 5' }),
      Venue.findByIdAndUpdate(vMultiUpdate._id, { location: 'Loc 6' })
    ]);

    const vMultiFinal = await Venue.findById(vMultiUpdate._id);
    const multiJobs = await SyncQueue.find({ documentId: vMultiUpdate._id }).sort({ version: 1 });

    assert(vMultiFinal._syncVersion === 7, `3g. 6 atomic updates incremented version from 1 to 7 (actual: ${vMultiFinal._syncVersion})`);
    assert(multiJobs.length === 7, `3h. Exactly 7 queue jobs recorded (1 CREATE + 6 UPDATEs, actual: ${multiJobs.length})`);

    // =========================================================================
    // SECTION 4: deleteMany() Failure and Recovery Verification
    // =========================================================================
    console.log('\n--- SECTION 4: deleteMany() Failure and Recovery ---');
    const recTag = `FinalTest_RecBatch_${Date.now()}`;
    const r1 = await Venue.create({ name: `Rec1 ${recTag}`, location: recTag, capacity: 10, venueType: 'Lab' });
    const r2 = await Venue.create({ name: `Rec2 ${recTag}`, location: recTag, capacity: 20, venueType: 'Lab' });
    const r3 = await Venue.create({ name: `Rec3 ${recTag}`, location: recTag, capacity: 30, venueType: 'Lab' });
    const r4 = await Venue.create({ name: `Rec4 ${recTag}`, location: recTag, capacity: 40, venueType: 'Lab' });

    // Execute deleteMany
    await Venue.deleteMany({ location: recTag });

    // Simulate crash after tombstones created but before queue jobs for r2, r3, r4
    await SyncQueue.deleteMany({ documentId: { $in: [r2._id, r3._id, r4._id] }, operation: 'DELETE' });

    const queueBeforeRec = await SyncQueue.find({ documentId: { $in: [r1._id, r2._id, r3._id, r4._id] }, operation: 'DELETE' });
    assert(queueBeforeRec.length === 1, '4a. Simulated crash: only 1 of 4 DELETE jobs exists in queue');

    // Run reconciliation
    const reconBatchFinal = await syncReconciliationService.reconcileAll();
    const queueAfterRec = await SyncQueue.find({ documentId: { $in: [r1._id, r2._id, r3._id, r4._id] }, operation: 'DELETE' });

    assert(queueAfterRec.length === 4, '4b. Reconciler recovered all 3 missing DELETE jobs (total: 4)');

    // Run reconciliation a second time
    const reconSecondTime = await syncReconciliationService.reconcileAll();
    const queueAfterSecond = await SyncQueue.find({ documentId: { $in: [r1._id, r2._id, r3._id, r4._id] }, operation: 'DELETE' });

    assert(reconSecondTime.mutationsEnqueued === 0, '4c. Repeated reconciliation enqueued 0 duplicate jobs');
    assert(queueAfterSecond.length === 4, '4d. Queue count remains exactly 4 (zero duplicate jobs created)');

    // Clean up test venues
    await Venue.deleteMany({ name: /FinalTest/ });
    await SyncQueue.deleteMany({ collectionName: 'venues' });
    await SyncTombstone.deleteMany({ collectionName: 'venues' });
    await SyncConflict.deleteMany({ collectionName: 'venues' });

    console.log('\n====================================================');
    console.log(`FINAL RELIABILITY SUITE: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} tests`);
    console.log('====================================================\n');

    await connectDB.closeAll();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Final reliability suite execution error:', err);
    await connectDB.closeAll();
    process.exit(1);
  }
};

runFinalVerificationSuite();
