const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const initialSyncService = require('../src/services/initialSyncService');

describe('InitialSyncService Comprehensive Unit & Safety Tests', () => {
  let client;
  let testLocalDb;
  let testMockAtlasDb;
  const testLocalDbName = 'festflow_initial_sync_local_test';
  const testAtlasDbName = 'festflow_initial_sync_atlas_test';

  beforeAll(async () => {
    client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    testLocalDb = client.db(testLocalDbName);
    testMockAtlasDb = client.db(testAtlasDbName);

    await testLocalDb.dropDatabase().catch(() => {});
    await testMockAtlasDb.dropDatabase().catch(() => {});
  });

  afterAll(async () => {
    await testLocalDb.dropDatabase().catch(() => {});
    await testMockAtlasDb.dropDatabase().catch(() => {});
    await client.close();
  });

  beforeEach(async () => {
    // Clean mock collections before each test
    const colls = await testMockAtlasDb.listCollections().toArray();
    for (const c of colls) {
      await testMockAtlasDb.collection(c.name).deleteMany({});
    }
  });

  // Test 1: Empty Atlas Insert Behavior
  test('1. Empty Atlas insert behavior: inserts document under canonical ObjectId', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const doc = {
      _id: new ObjectId(),
      name: 'Dr. APJ Abdul Kalam Auditorium',
      capacity: 800,
      _syncVersion: 1
    };

    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res.status).toBe('INSERTED');
    expect(res.action).toBe('INSERT');

    const inserted = await coll.findOne({ _id: doc._id });
    expect(inserted).not.toBeNull();
    expect(inserted.name).toBe('Dr. APJ Abdul Kalam Auditorium');
    expect(inserted._syncVersion).toBe(1);
  });

  // Test 2: Lower-version Update
  test('2. Lower-version update: conditionally updates when local version is newer', async () => {
    const coll = testMockAtlasDb.collection('events');
    const docId = new ObjectId();
    
    // Seed cloud doc with v1
    await coll.insertOne({
      _id: docId,
      title: 'HackFest 2026',
      status: 'draft',
      _syncVersion: 1
    });

    // Local has v2
    const newerDoc = {
      _id: docId,
      title: 'HackFest 2026',
      status: 'published',
      _syncVersion: 2
    };

    const res = await initialSyncService.syncDocumentICAS(coll, newerDoc);
    expect(res.status).toBe('UPDATED');
    expect(res.localVer).toBe(2);
    expect(res.cloudVer).toBe(1);

    const updated = await coll.findOne({ _id: docId });
    expect(updated.status).toBe('published');
    expect(updated._syncVersion).toBe(2);
  });

  // Test 3: Equal-version Identical Content (Idempotency)
  test('3. Equal-version identical content: returns ALREADY_SYNCED_EQUAL without error', async () => {
    const coll = testMockAtlasDb.collection('users');
    const docId = new ObjectId();

    const doc = {
      _id: docId,
      email: 'student@festflow.edu',
      name: 'Ananya Iyer',
      _syncVersion: 1
    };

    await coll.insertOne({ ...doc });

    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res.status).toBe('ALREADY_SYNCED_EQUAL');
    expect(res.action).toBe('IDEMPOTENT_NOOP');
  });

  // Test 4: Equal-version Content Conflict
  test('4. Equal-version content conflict: flags CONFLICT_EQUAL_VERSION_DIFF_CONTENT when content diverges', async () => {
    const coll = testMockAtlasDb.collection('users');
    const docId = new ObjectId();

    // Cloud has version 1 with one phone number
    await coll.insertOne({
      _id: docId,
      email: 'student@festflow.edu',
      phone: '+91 98765 00000',
      _syncVersion: 1
    });

    // Local has version 1 with different phone number
    const divergentDoc = {
      _id: docId,
      email: 'student@festflow.edu',
      phone: '+91 99999 11111',
      _syncVersion: 1
    };

    const res = await initialSyncService.syncDocumentICAS(coll, divergentDoc);
    expect(res.status).toBe('CONFLICT_EQUAL_VERSION_DIFF_CONTENT');
    expect(res.action).toBe('FLAG_CONFLICT');
  });

  // Test 5: Higher-version Cloud Protection
  test('5. Higher-version protection: preserves newer cloud data and rejects stale local snapshot', async () => {
    const coll = testMockAtlasDb.collection('clubs');
    const docId = new ObjectId();

    // Cloud is at v3
    await coll.insertOne({
      _id: docId,
      name: 'CodeNexus Developers Club',
      category: 'Technical',
      _syncVersion: 3
    });

    // Local snapshot is at v1
    const staleDoc = {
      _id: docId,
      name: 'CodeNexus Developers Club',
      category: 'Technical',
      _syncVersion: 1
    };

    const res = await initialSyncService.syncDocumentICAS(coll, staleDoc);
    expect(res.status).toBe('CONFLICT_CLOUD_NEWER');
    expect(res.action).toBe('PRESERVE_CLOUD');

    const preserved = await coll.findOne({ _id: docId });
    expect(preserved._syncVersion).toBe(3);
  });

  // Test 6: Duplicate-key Race Handling
  test('6. Duplicate-key race: handles concurrent insertion and falls back to version evaluation', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const docId = new ObjectId();
    const doc = {
      _id: docId,
      name: 'Aryabhata Seminar Hall',
      _syncVersion: 1
    };

    // Pre-insert doc behind the scenes to simulate concurrent write
    await coll.insertOne({ ...doc });

    // Calling syncDocumentICAS should safely handle existing doc
    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res.status).toBe('ALREADY_SYNCED_EQUAL');
  });

  // Test 7: Retry Idempotency
  test('7. Retry idempotency: multiple consecutive sync calls succeed without duplicate key errors', async () => {
    const coll = testMockAtlasDb.collection('certificates');
    const doc = {
      _id: new ObjectId(),
      certificateNo: 'CERT-2026-FEST-001',
      _syncVersion: 1
    };

    const res1 = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res1.status).toBe('INSERTED');

    const res2 = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res2.status).toBe('ALREADY_SYNCED_EQUAL');

    const res3 = await initialSyncService.syncDocumentICAS(coll, doc);
    expect(res3.status).toBe('ALREADY_SYNCED_EQUAL');

    const count = await coll.countDocuments({ _id: doc._id });
    expect(count).toBe(1);
  });

  // Test 8: Dependency Ordering & Parent Verification
  test('8. Dependency ordering: child upload blocked when parent does not exist in Atlas', async () => {
    const parentVenueId = new ObjectId();
    const parentClubId = new ObjectId();
    const childEvent = {
      collection: 'events',
      document: {
        _id: new ObjectId(),
        title: 'RoboWars',
        club: parentClubId,
        venue: parentVenueId,
        _syncVersion: 1
      }
    };

    // Neither parent is in Atlas -> should fail parent check
    const check1 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    expect(check1.valid).toBe(false);
    expect(check1.targetCollection).toBe('clubs');

    // Add club, but venue still missing
    await testMockAtlasDb.collection('clubs').insertOne({ _id: parentClubId, name: 'RoboTech', _syncVersion: 1 });
    const check2 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    expect(check2.valid).toBe(false);
    expect(check2.targetCollection).toBe('venues');

    // Add venue -> parent check passes
    await testMockAtlasDb.collection('venues').insertOne({ _id: parentVenueId, name: 'Aryabhata', _syncVersion: 1 });
    const check3 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    expect(check3.valid).toBe(true);
  });

  // Test 9: Quarantine Exclusions
  test('9. Quarantine exclusions: getEligibleDocumentsByTier strictly excludes quarantined records', async () => {
    // Populate mock local db with test docs + quarantined collection
    await testLocalDb.collection('_orphaned_clubmemberships_backup').insertMany([
      { _id: new ObjectId(), user: new ObjectId(), club: new ObjectId(), role: 'member' },
      { _id: new ObjectId(), user: new ObjectId(), club: new ObjectId(), role: 'coordinator' }
    ]);

    // Read live local database to test actual getEligibleDocumentsByTier
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');

    const tiers = await initialSyncService.getEligibleDocumentsByTier(liveDb);
    let totalEligible = 0;
    for (let t = 0; t <= 4; t++) {
      totalEligible += tiers[t].length;
      // Confirm no quarantined collection in tier items
      for (const item of tiers[t]) {
        expect(item.collection).not.toBe('_orphaned_clubmemberships_backup');
      }
    }
    expect(totalEligible).toBe(37);
    await liveClient.close();
  });

  // Test 10: Faculty Exclusion
  test('10. Faculty exclusion: faculty@festflow.edu is strictly excluded from Tier 0', async () => {
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');

    const tiers = await initialSyncService.getEligibleDocumentsByTier(liveDb);
    const tier0Users = tiers[0].filter((item) => item.collection === 'users');

    expect(tier0Users.length).toBe(3);
    const facultyUser = tier0Users.find((u) => u.document.email === 'faculty@festflow.edu');
    expect(facultyUser).toBeUndefined();

    await liveClient.close();
  });

  // Test 11: Legacy Queue Isolation
  test('11. Legacy queue isolation: initial sync operates without reading or modifying SyncQueue', async () => {
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');

    const queueBefore = await liveDb.collection('syncqueues').countDocuments();
    expect(queueBefore).toBe(241);

    // Call service methods
    await initialSyncService.getEligibleDocumentsByTier(liveDb);

    const queueAfter = await liveDb.collection('syncqueues').countDocuments();
    expect(queueAfter).toBe(queueBefore);
    await liveClient.close();
  });

  // Test 12: Tombstone Safety (Rule 1: Absent from Cloud)
  test('12. Tombstone safety: Rule 1 correctly classifies tombstones absent from cloud as safe to reconcile without deleteOne()', async () => {
    const localTombstones = [
      { _id: new ObjectId(), collectionName: 'users', documentId: new ObjectId() },
      { _id: new ObjectId(), collectionName: 'clubs', documentId: new ObjectId() }
    ];
    await testLocalDb.collection('synctombstones').insertMany(localTombstones);

    // Mock Atlas is empty
    const evalRes = await initialSyncService.evaluateTombstonesRule1(testLocalDb, testMockAtlasDb, true);
    expect(evalRes.length).toBe(2);
    expect(evalRes[0].ruleApplied).toBe('RULE_1_ABSENT_FROM_CLOUD');
    expect(evalRes[0].action).toBe('ARCHIVE_WITHOUT_CLOUD_DELETE');
    expect(evalRes[0].safeToReconcile).toBe(true);

    await testLocalDb.collection('synctombstones').deleteMany({});
  });

  // Test 13: BSON Type Preservation
  test('13. BSON type preservation: preserves native ObjectIds, Dates, and nested arrays', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const docId = new ObjectId();
    const now = new Date();
    const doc = {
      _id: docId,
      name: 'Alan Turing Lab',
      createdAt: now,
      facilities: [
        { name: 'Gigabit Ethernet', status: 'available' },
        { name: 'Dual Monitors', status: 'available' }
      ],
      _syncVersion: 1
    };

    await initialSyncService.syncDocumentICAS(coll, doc);

    const retrieved = await coll.findOne({ _id: docId });
    expect(retrieved._id).toBeInstanceOf(ObjectId);
    expect(retrieved.createdAt).toBeInstanceOf(Date);
    expect(retrieved.createdAt.getTime()).toBe(now.getTime());
    expect(Array.isArray(retrieved.facilities)).toBe(true);
    expect(retrieved.facilities.length).toBe(2);
  });

  // Test 14: Interrupted Upload Recovery Simulation
  test('14. Interrupted upload recovery: safe resumption skips already synced batches idempotently', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const doc1 = { _id: new ObjectId(), name: 'Venue 1', _syncVersion: 1 };
    const doc2 = { _id: new ObjectId(), name: 'Venue 2', _syncVersion: 1 };

    // Batch 1 uploads doc1, then crashes before doc2
    const res1 = await initialSyncService.syncDocumentICAS(coll, doc1);
    expect(res1.status).toBe('INSERTED');

    // Resumption restarts batch: doc1 should be idempotent NOOP, doc2 should be inserted
    const resumeRes1 = await initialSyncService.syncDocumentICAS(coll, doc1);
    expect(resumeRes1.status).toBe('ALREADY_SYNCED_EQUAL');

    const resumeRes2 = await initialSyncService.syncDocumentICAS(coll, doc2);
    expect(resumeRes2.status).toBe('INSERTED');

    const total = await coll.countDocuments();
    expect(total).toBe(2);
  });
});
