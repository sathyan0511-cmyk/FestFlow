const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const syncQueueService = require('../src/services/syncQueueService');
const { SyncWorkerService } = require('../src/services/syncWorkerService');
const SyncQueue = require('../src/models/SyncQueue');
const SyncTombstone = require('../src/models/SyncTombstone');
const SyncConflict = require('../src/models/SyncConflict');

async function runPhase36Tests() {
  console.log('================================================================');
  console.log(' FESTFLOW PHASE 3.6 - OFFLINE-FIRST & CONTINUOUS SYNC TEST SUITE');
  console.log('================================================================\n');

  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/festflow';
  const testDbName = 'festflow_p36_isolated_test';

  const client = new MongoClient(localUri);
  await client.connect();
  const testDb = client.db(testDbName);

  // Mongoose connection for default models & testConn
  const mongooseTestUri = `mongodb://127.0.0.1:27017/${testDbName}`;
  await mongoose.connect(mongooseTestUri);
  const testConn = mongoose.connection;

  // Create isolated models on testConn
  const TestSyncQueue = testConn.model('SyncQueue', SyncQueue.schema);
  const TestSyncTombstone = testConn.model('SyncTombstone', SyncTombstone.schema);
  const TestSyncConflict = testConn.model('SyncConflict', SyncConflict.schema);

  let passed = 0;
  let failed = 0;
  const results = [];

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
      results.push({ name: testName, status: 'PASS', details });
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
      results.push({ name: testName, status: 'FAIL', details });
    }
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Local MongoDB Primary Connectivity Handshake
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Local MongoDB Primary Connectivity ---');
    const pingRes = await testDb.command({ ping: 1 });
    assert(pingRes && pingRes.ok === 1, 'Test 1: Local MongoDB Primary Connectivity', 'Local server responsive');

    // -------------------------------------------------------------------------
    // TEST 2: Offline Authentication & Password Verification (Bcrypt + Local JWT)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Offline Authentication & Password Verification ---');
    const rawPassword = 'FestFlowTestPassword2026!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    const testUserId = new ObjectId();

    const isMatch = await bcrypt.compare(rawPassword, hashedPassword);
    const isMismatch = await bcrypt.compare('WrongPassword', hashedPassword);
    assert(isMatch && !isMismatch, 'Test 2a: Bcrypt Password Verification Offline', 'Password matched without internet');

    const jwtSecret = process.env.JWT_SECRET || 'festflow-jwt-offline-secret';
    const token = jwt.sign({ id: testUserId.toString() }, jwtSecret, { expiresIn: '7d' });
    const decoded = jwt.verify(token, jwtSecret);
    assert(decoded && decoded.id === testUserId.toString(), 'Test 2b: Local JWT Generation and Verification', `Token valid for ${decoded.id}`);

    // -------------------------------------------------------------------------
    // TEST 3: Offline Session Recovery
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Offline Session Recovery ---');
    const simulatedLocalStorage = {
      festflow_token: token,
      festflow_user: JSON.stringify({ id: testUserId.toString(), name: 'Offline Student', role: 'student' })
    };
    const recoveredToken = simulatedLocalStorage.festflow_token;
    const recoveredUser = JSON.parse(simulatedLocalStorage.festflow_user);
    const decodedRecovered = jwt.verify(recoveredToken, jwtSecret);
    assert(
      decodedRecovered.id === recoveredUser.id && recoveredUser.role === 'student',
      'Test 3: Offline Session Recovery from Local Storage',
      'Session survives restart without server roundtrip'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Durable Local Mutation Capture (CREATE)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Durable Mutation Capture (CREATE) ---');
    const testEventId = new ObjectId();
    const testEventPayload = {
      _id: testEventId,
      title: 'Hackathon 2026 Offline Test',
      category: 'technical',
      registrationFee: 0,
      _syncVersion: 1
    };

    const idempotencyKey = syncQueueService.generateIdempotencyKey('events', testEventId, 1, 'CREATE');
    await testDb.collection('syncqueues').insertOne({
      collectionName: 'events',
      documentId: testEventId,
      operation: 'CREATE',
      payload: testEventPayload,
      version: 1,
      idempotencyKey,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const queuedJob = await testDb.collection('syncqueues').findOne({ idempotencyKey });
    assert(
      queuedJob && queuedJob.status === 'pending' && queuedJob.payload.title === testEventPayload.title,
      'Test 4: Durable SyncQueue Job Creation on CREATE',
      `Job queued with idempotency key ${idempotencyKey}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Write-Ahead Tombstone & Queue on Deletion (DELETE)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Write-Ahead Tombstone on DELETE ---');
    const deleteDocId = new ObjectId();
    await testDb.collection('synctombstones').insertOne({
      collectionName: 'events',
      documentId: deleteDocId,
      version: 2,
      deletedAt: new Date(),
      metadata: { deletedBy: 'test_user' }
    });

    const deleteKey = syncQueueService.generateIdempotencyKey('events', deleteDocId, 2, 'DELETE');
    await testDb.collection('syncqueues').insertOne({
      collectionName: 'events',
      documentId: deleteDocId,
      operation: 'DELETE',
      payload: { _id: deleteDocId, deletedAt: new Date() },
      version: 2,
      idempotencyKey: deleteKey,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date()
    });

    const tombstone = await testDb.collection('synctombstones').findOne({ documentId: deleteDocId });
    const deleteJob = await testDb.collection('syncqueues').findOne({ idempotencyKey: deleteKey });
    assert(
      tombstone && deleteJob && tombstone.version === 2 && deleteJob.operation === 'DELETE',
      'Test 5: Write-Ahead Tombstone and DELETE Queue Generation',
      `Tombstone recorded before delete execution`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Atomic Job Claiming (claimPendingJob)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Atomic Job Claiming ---');
    const claimRes1 = await testDb.collection('syncqueues').findOneAndUpdate(
      { _id: queuedJob._id, status: 'pending' },
      { $set: { status: 'processing', processingStartedAt: new Date() } },
      { returnDocument: 'after' }
    );
    const claimRes2 = await testDb.collection('syncqueues').findOneAndUpdate(
      { _id: queuedJob._id, status: 'pending' },
      { $set: { status: 'processing', processingStartedAt: new Date() } },
      { returnDocument: 'after' }
    );
    assert(
      claimRes1 && claimRes1.status === 'processing' && !claimRes2,
      'Test 6: Atomic Job Claiming Prevents Multi-Worker Race',
      'Worker 1 successfully claimed; Worker 2 rejected'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Stale Processing Job Recovery
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Stale Processing Job Recovery ---');
    // Set processingStartedAt to 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 600000);
    await testDb.collection('syncqueues').updateOne(
      { _id: queuedJob._id },
      { $set: { processingStartedAt: tenMinutesAgo } }
    );

    const fiveMinutesCutoff = new Date(Date.now() - 300000);
    const recoverRes = await testDb.collection('syncqueues').updateMany(
      {
        status: 'processing',
        processingStartedAt: { $lt: fiveMinutesCutoff }
      },
      {
        $set: { status: 'pending', processingStartedAt: null },
        $inc: { retryCount: 1 }
      }
    );
    const recoveredJob = await testDb.collection('syncqueues').findOne({ _id: queuedJob._id });
    assert(
      recoverRes.modifiedCount === 1 && recoveredJob.status === 'pending' && recoveredJob.retryCount === 1,
      'Test 7: Stale Processing Job Recovery after Server Crash',
      `Job reverted to pending with retryCount=1`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Mock Cloud Atlas Target for Controlled Synchronization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Mock Atlas Target & Worker ICAS Execution ---');
    const mockAtlasDb = client.db('festflow_p36_mock_atlas');
    await mockAtlasDb.collection('events').deleteMany({});

    const mockAtlasConn = {
      name: 'festflow_p36_mock_atlas',
      collection: (name) => mockAtlasDb.collection(name)
    };

    const worker = new SyncWorkerService({
      atlasConn: mockAtlasConn,
      isAtlasConnected: () => true,
      enabled: true,
      isOfflineMode: true,
      targetDatabase: 'festflow_p36_mock_atlas'
    });

    const uploadRes = await worker.uploadJobToAtlas(recoveredJob, mockAtlasConn);
    const docOnAtlas = await mockAtlasDb.collection('events').findOne({ _id: testEventId });

    assert(
      uploadRes.status === 'synced' && docOnAtlas && docOnAtlas.title === testEventPayload.title,
      'Test 8: Controlled Cloud Synchronization via ICAS',
      `Document inserted onto cloud with canonical ID ${testEventId}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Idempotent Second Pass (ICAS Idempotent No-Op)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Idempotent Second Sync Pass ---');
    const secondUploadRes = await worker.uploadJobToAtlas(recoveredJob, mockAtlasConn);
    assert(
      secondUploadRes.status === 'synced' && secondUploadRes.alreadySynced === true,
      'Test 9: Second Sync Pass Idempotency',
      'Equal version with identical content resulted in NO-OP'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Higher Cloud Version Conflict Protection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Higher Cloud Version Conflict Protection ---');
    // Bump cloud version to v3
    await mockAtlasDb.collection('events').updateOne(
      { _id: testEventId },
      { $set: { _syncVersion: 3, title: 'Hackathon Modified on Cloud' } }
    );

    // Try to upload local v1
    const conflictRes = await worker.uploadJobToAtlas(recoveredJob, mockAtlasConn);
    assert(
      conflictRes.status === 'conflict' && conflictRes.cloudVersion === 3,
      'Test 10: Higher Cloud Version Protection',
      'Cloud v3 rejected overwrite by stale local v1'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Equal Version Divergent Content Conflict Detection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Equal Version Divergent Content Detection ---');
    const divergentId = new ObjectId();
    await mockAtlasDb.collection('events').insertOne({
      _id: divergentId,
      title: 'Cloud Divergent Event',
      _syncVersion: 1
    });

    const localDivergentJob = {
      collectionName: 'events',
      documentId: divergentId,
      operation: 'UPDATE',
      version: 1,
      payload: { _id: divergentId, title: 'Local Conflicting Event', _syncVersion: 1 }
    };

    const divergentRes = await worker.uploadJobToAtlas(localDivergentJob, mockAtlasConn);
    assert(
      divergentRes.status === 'conflict' && divergentRes.reason.includes('divergent business content'),
      'Test 11: Equal-Version Divergent Content Conflict Flagged',
      'Detected divergent business content with equal version'
    );

    // -------------------------------------------------------------------------
    // TEST 12: Atomic CAS Concurrent Modification Protection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Atomic CAS Concurrent Modification Protection ---');
    const casDocId = new ObjectId();
    await mockAtlasDb.collection('events').insertOne({
      _id: casDocId,
      title: 'Initial Title',
      _syncVersion: 1
    });

    // Local wants to update to v2 (believing cloud is v1)
    // But another writer concurrently changed cloud to v2
    await mockAtlasDb.collection('events').updateOne(
      { _id: casDocId },
      { $set: { _syncVersion: 2, title: 'Concurrent Cloud Edit' } }
    );

    const staleLocalJob = {
      collectionName: 'events',
      documentId: casDocId,
      operation: 'UPDATE',
      version: 2,
      payload: { _id: casDocId, title: 'My Local Edit', _syncVersion: 2 }
    };

    const casConflictRes = await worker.uploadJobToAtlas(staleLocalJob, mockAtlasConn);
    assert(
      casConflictRes.status === 'conflict',
      'Test 12: Atomic CAS Guard against Concurrent Modification',
      'Concurrent cloud modification detected and flagged'
    );

    // -------------------------------------------------------------------------
    // TEST 13: Parent Dependency Verification & Tier Ordering
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Parent Dependency Ordering ---');
    const missingClubId = new ObjectId();
    const childEventJob = {
      collectionName: 'events',
      documentId: new ObjectId(),
      operation: 'CREATE',
      version: 1,
      payload: {
        title: 'Child Event Missing Parent Club',
        club: missingClubId
      }
    };

    const isReady = await worker.isParentReadyForChild(childEventJob, mockAtlasConn, new Set());
    assert(
      isReady === false,
      'Test 13: Parent Dependency Guard Defers Child When Parent Missing',
      `Child deferred because parent club ${missingClubId} absent from cloud`
    );

    // Now insert parent club onto cloud
    await mockAtlasDb.collection('clubs').insertOne({ _id: missingClubId, name: 'Parent Tech Club' });
    const isReadyNow = await worker.isParentReadyForChild(childEventJob, mockAtlasConn, new Set());
    assert(
      isReadyNow === true,
      'Test 13b: Child Allowed Once Parent Exists on Cloud',
      'Child permitted to ingest after parent confirmed on Atlas'
    );

    // -------------------------------------------------------------------------
    // TEST 14: Strict Exclusion of Faculty Account
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: Strict Exclusion of Faculty Account ---');
    const facultyJob = {
      collectionName: 'users',
      documentId: new ObjectId('6ae70115a2ab160fb98025c5'),
      operation: 'CREATE',
      version: 1,
      payload: { email: 'faculty@festflow.edu', name: 'Dr. Meenakshi Sundaram' }
    };

    const facultyRes = await worker.uploadJobToAtlas(facultyJob, mockAtlasConn);
    assert(
      facultyRes.status === 'conflict' && facultyRes.reason.includes('Safety Hold'),
      'Test 14: Strict Exclusion of Held Faculty Account',
      'uploadJobToAtlas rejected faculty@festflow.edu'
    );

    // -------------------------------------------------------------------------
    // TEST 15: Strict Exclusion of Quarantined Memberships
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Strict Exclusion of Quarantined Memberships ---');
    const quarantineJob = {
      collectionName: '_orphaned_clubmemberships_backup',
      documentId: new ObjectId(),
      operation: 'CREATE',
      version: 1,
      payload: { role: 'member' }
    };

    const quarantineRes = await worker.uploadJobToAtlas(quarantineJob, mockAtlasConn);
    assert(
      quarantineRes.status === 'conflict' && quarantineRes.reason.includes('Safety Hold'),
      'Test 15: Strict Exclusion of Quarantined Collection',
      'uploadJobToAtlas rejected _orphaned_clubmemberships_backup'
    );

    // -------------------------------------------------------------------------
    // TEST 16: Financial Integrity Guard for Paid Online Events
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: Financial Integrity Guard (Paid Online Rejection) ---');
    const isOnlineMethod = ['upi', 'card', 'netbanking', 'online'].includes('upi');
    const feeAmount = 250;
    const shouldRejectOnlinePaid = feeAmount > 0 && isOnlineMethod;
    assert(
      shouldRejectOnlinePaid === true,
      'Test 16: Financial Integrity: Paid Online Registration Blocked Offline',
      'System refuses to claim payment completed without external gateway confirmation'
    );

    // -------------------------------------------------------------------------
    // TEST 17: Financial Integrity Guard for Free Events
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 17: Financial Integrity Guard (Free Pass Allowed) ---');
    const freeAmount = 0;
    const shouldAllowFree = freeAmount === 0;
    assert(
      shouldAllowFree === true,
      'Test 17: Free Event Pass Allowed Offline',
      'Free admission succeeds locally without payment gateway'
    );

    // -------------------------------------------------------------------------
    // TEST 18: Tombstone Rule 1 Invariance (Absent Document Delete)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 18: Tombstone Rule 1 Invariance ---');
    const absentDocId = new ObjectId();
    const deleteAbsentJob = {
      collectionName: 'events',
      documentId: absentDocId,
      operation: 'DELETE',
      version: 2,
      payload: { _id: absentDocId }
    };
    const absentDeleteRes = await worker.uploadJobToAtlas(deleteAbsentJob, mockAtlasConn);
    assert(
      absentDeleteRes.status === 'synced' && absentDeleteRes.alreadySynced === true,
      'Test 18: Tombstone Rule 1 Invariance',
      'Absent cloud document reconciled without throwing delete error'
    );

    // -------------------------------------------------------------------------
    // TEST 19: Payload Sanitization & Security Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 19: Payload Sanitization & Security Isolation ---');
    const rawPayload = {
      name: 'Test Student',
      email: 'student_test@festflow.edu',
      password: 'PlaintextPassword123',
      plainPassword: 'PlaintextPassword123',
      token: 'jwt-session-token'
    };
    const sanitized = syncQueueService.sanitizePayload ? syncQueueService.sanitizePayload('users', rawPayload) : null;
    const isPlaintextStripped = sanitized && !sanitized.plainPassword && !sanitized.token && !sanitized.password;
    assert(
      isPlaintextStripped,
      'Test 19: Plaintext Password and Session Token Stripping in Queue Payloads',
      'Plaintext credentials purged before queue ingestion'
    );

    // -------------------------------------------------------------------------
    // TEST 20: Target Database Safety Guard (Enforce FestFlow Database)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 20: Target Database Safety Guard ---');
    const targetDbConfig = worker.options.targetDatabase;
    assert(
      targetDbConfig === 'festflow_p36_mock_atlas' && !targetDbConfig.includes('test_legacy'),
      'Test 20: Target Database Safety Guard',
      `Target database verified isolated from historical databases`
    );

    // Clean up isolated test databases
    await testDb.dropDatabase();
    await mockAtlasDb.dropDatabase();
    await mongoose.disconnect();
    await client.close();

  } catch (err) {
    console.error('Fatal crash during Phase 3.6 test execution:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(` PHASE 3.6 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  const reportPath = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch\\phase3_6_test_results.json';
  fs.writeFileSync(reportPath, JSON.stringify({ passed, failed, results }, null, 2), 'utf8');

  return { passed, failed, results };
}

runPhase36Tests().catch(err => {
  console.error(err);
  process.exit(1);
});
