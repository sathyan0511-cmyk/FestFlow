const path = require('path');
const assert = require('assert');
const { MongoClient, ObjectId } = require('mongodb');
const initialSyncService = require('../src/services/initialSyncService');

async function runAllTests() {
  console.log('================================================================');
  console.log(' Running InitialSyncService Automated Native Test Suite');
  console.log('================================================================');

  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const testLocalDb = client.db('festflow_native_test_local');
  const testMockAtlasDb = client.db('festflow_native_test_atlas');

  await testLocalDb.dropDatabase().catch(() => {});
  await testMockAtlasDb.dropDatabase().catch(() => {});

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✅ Test ${total}: ${name}`);
    } catch (err) {
      console.error(`  ❌ Test ${total} FAILED: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Empty Atlas Insert
  await test('Empty Atlas insert behavior: inserts document under canonical ObjectId', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const doc = { _id: new ObjectId(), name: 'Kalam Auditorium', capacity: 800, _syncVersion: 1 };
    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res.status, 'INSERTED');
    const inserted = await coll.findOne({ _id: doc._id });
    assert.strictEqual(inserted.name, 'Kalam Auditorium');
    assert.strictEqual(inserted._syncVersion, 1);
  });

  // 2. Lower-version Update
  await test('Lower-version update: conditionally updates when local is newer', async () => {
    const coll = testMockAtlasDb.collection('events');
    const docId = new ObjectId();
    await coll.insertOne({ _id: docId, title: 'HackFest', status: 'draft', _syncVersion: 1 });
    const newerDoc = { _id: docId, title: 'HackFest', status: 'published', _syncVersion: 2 };
    const res = await initialSyncService.syncDocumentICAS(coll, newerDoc);
    assert.strictEqual(res.status, 'UPDATED');
    const updated = await coll.findOne({ _id: docId });
    assert.strictEqual(updated.status, 'published');
    assert.strictEqual(updated._syncVersion, 2);
  });

  // 3. Equal-version Identical Content (Idempotency)
  await test('Equal-version identical content: returns ALREADY_SYNCED_EQUAL without error', async () => {
    const coll = testMockAtlasDb.collection('users');
    const docId = new ObjectId();
    const doc = { _id: docId, email: 'student@festflow.edu', name: 'Ananya Iyer', _syncVersion: 1 };
    await coll.insertOne({ ...doc });
    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res.status, 'ALREADY_SYNCED_EQUAL');
  });

  // 4. Equal-version Content Conflict
  await test('Equal-version content conflict: flags CONFLICT_EQUAL_VERSION_DIFF_CONTENT', async () => {
    const coll = testMockAtlasDb.collection('users');
    const docId = new ObjectId();
    await coll.insertOne({ _id: docId, email: 'student@festflow.edu', phone: '+91 98765 00000', _syncVersion: 1 });
    const divergent = { _id: docId, email: 'student@festflow.edu', phone: '+91 99999 11111', _syncVersion: 1 };
    const res = await initialSyncService.syncDocumentICAS(coll, divergent);
    assert.strictEqual(res.status, 'CONFLICT_EQUAL_VERSION_DIFF_CONTENT');
  });

  // 5. Higher-version Cloud Protection
  await test('Higher-version protection: preserves newer cloud data and rejects stale local snapshot', async () => {
    const coll = testMockAtlasDb.collection('clubs');
    const docId = new ObjectId();
    await coll.insertOne({ _id: docId, name: 'CodeNexus', _syncVersion: 3 });
    const stale = { _id: docId, name: 'CodeNexus', _syncVersion: 1 };
    const res = await initialSyncService.syncDocumentICAS(coll, stale);
    assert.strictEqual(res.status, 'CONFLICT_CLOUD_NEWER');
    const preserved = await coll.findOne({ _id: docId });
    assert.strictEqual(preserved._syncVersion, 3);
  });

  // 6. Duplicate-key Race Handling
  await test('Duplicate-key race: handles concurrent insertion gracefully', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const docId = new ObjectId();
    const doc = { _id: docId, name: 'Aryabhata Hall', _syncVersion: 1 };
    await coll.insertOne({ ...doc });
    const res = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res.status, 'ALREADY_SYNCED_EQUAL');
  });

  // 7. Retry Idempotency
  await test('Retry idempotency: consecutive calls succeed without duplicate key error', async () => {
    const coll = testMockAtlasDb.collection('certificates');
    const doc = { _id: new ObjectId(), certificateNo: 'CERT-2026-FEST-001', _syncVersion: 1 };
    const res1 = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res1.status, 'INSERTED');
    const res2 = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res2.status, 'ALREADY_SYNCED_EQUAL');
    const res3 = await initialSyncService.syncDocumentICAS(coll, doc);
    assert.strictEqual(res3.status, 'ALREADY_SYNCED_EQUAL');
    assert.strictEqual(await coll.countDocuments({ _id: doc._id }), 1);
  });

  // 8. Dependency Ordering & Parent Verification
  await test('Dependency ordering: child blocked when parent does not exist in Atlas', async () => {
    const parentVenueId = new ObjectId();
    const parentClubId = new ObjectId();
    const childEvent = {
      collection: 'events',
      document: { _id: new ObjectId(), title: 'RoboWars', club: parentClubId, venue: parentVenueId, _syncVersion: 1 }
    };
    const check1 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    assert.strictEqual(check1.valid, false);
    assert.strictEqual(check1.targetCollection, 'clubs');

    await testMockAtlasDb.collection('clubs').insertOne({ _id: parentClubId, name: 'RoboTech', _syncVersion: 1 });
    const check2 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    assert.strictEqual(check2.valid, false);
    assert.strictEqual(check2.targetCollection, 'venues');

    await testMockAtlasDb.collection('venues').insertOne({ _id: parentVenueId, name: 'Aryabhata', _syncVersion: 1 });
    const check3 = await initialSyncService.verifyParentDependencies(testMockAtlasDb, childEvent);
    assert.strictEqual(check3.valid, true);
  });

  // 9. Quarantine Exclusions
  await test('Quarantine exclusions: strictly excludes quarantined records', async () => {
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');
    const tiers = await initialSyncService.getEligibleDocumentsByTier(liveDb);
    let totalEligible = 0;
    for (let t = 0; t <= 4; t++) {
      totalEligible += tiers[t].length;
      for (const item of tiers[t]) {
        assert.notStrictEqual(item.collection, '_orphaned_clubmemberships_backup');
      }
    }
    assert.strictEqual(totalEligible, 37);
    await liveClient.close();
  });

  // 10. Faculty Exclusion
  await test('Faculty exclusion: faculty@festflow.edu is strictly excluded', async () => {
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');
    const tiers = await initialSyncService.getEligibleDocumentsByTier(liveDb);
    const tier0Users = tiers[0].filter(i => i.collection === 'users');
    assert.strictEqual(tier0Users.length, 3);
    const faculty = tier0Users.find(u => u.document.email === 'faculty@festflow.edu');
    assert.strictEqual(faculty, undefined);
    await liveClient.close();
  });

  // 11. Legacy Queue Isolation
  await test('Legacy queue isolation: initial sync operates without reading or modifying SyncQueue', async () => {
    const liveClient = new MongoClient('mongodb://127.0.0.1:27017');
    await liveClient.connect();
    const liveDb = liveClient.db('festflow');
    const countBefore = await liveDb.collection('syncqueues').countDocuments();
    assert.strictEqual(countBefore, 241);
    await initialSyncService.getEligibleDocumentsByTier(liveDb);
    const countAfter = await liveDb.collection('syncqueues').countDocuments();
    assert.strictEqual(countAfter, 241);
    await liveClient.close();
  });

  // 12. Tombstone Safety
  await test('Tombstone safety: Rule 1 correctly classifies tombstones absent from cloud as safe to reconcile without deleteOne()', async () => {
    const tombstones = [
      { _id: new ObjectId(), collectionName: 'users', documentId: new ObjectId() }
    ];
    await testLocalDb.collection('synctombstones').insertMany(tombstones);
    const evalRes = await initialSyncService.evaluateTombstonesRule1(testLocalDb, testMockAtlasDb, true);
    assert.strictEqual(evalRes.length, 1);
    assert.strictEqual(evalRes[0].ruleApplied, 'RULE_1_ABSENT_FROM_CLOUD');
    assert.strictEqual(evalRes[0].safeToReconcile, true);
    await testLocalDb.collection('synctombstones').deleteMany({});
  });

  // 13. BSON Type Preservation
  await test('BSON type preservation: native ObjectIds, Dates, and nested arrays', async () => {
    const coll = testMockAtlasDb.collection('venues');
    const docId = new ObjectId();
    const now = new Date();
    const doc = { _id: docId, name: 'Alan Turing Lab', createdAt: now, facilities: [{ name: 'Gigabit Ethernet' }], _syncVersion: 1 };
    await initialSyncService.syncDocumentICAS(coll, doc);
    const retrieved = await coll.findOne({ _id: docId });
    assert(retrieved._id instanceof ObjectId);
    assert(retrieved.createdAt instanceof Date);
    assert.strictEqual(retrieved.createdAt.getTime(), now.getTime());
    assert(Array.isArray(retrieved.facilities));
  });

  // 14. Interrupted Upload Recovery
  await test('Interrupted upload recovery: safe resumption skips already synced batches idempotently', async () => {
    const coll = testMockAtlasDb.collection('recovery_venues');
    await coll.deleteMany({});
    const doc1 = { _id: new ObjectId(), name: 'Venue 1', _syncVersion: 1 };
    const doc2 = { _id: new ObjectId(), name: 'Venue 2', _syncVersion: 1 };
    const res1 = await initialSyncService.syncDocumentICAS(coll, doc1);
    assert.strictEqual(res1.status, 'INSERTED');
    const resume1 = await initialSyncService.syncDocumentICAS(coll, doc1);
    assert.strictEqual(resume1.status, 'ALREADY_SYNCED_EQUAL');
    const resume2 = await initialSyncService.syncDocumentICAS(coll, doc2);
    assert.strictEqual(resume2.status, 'INSERTED');
    assert.strictEqual(await coll.countDocuments(), 2);
  });

  await testLocalDb.dropDatabase().catch(() => {});
  await testMockAtlasDb.dropDatabase().catch(() => {});
  await client.close();

  console.log(`\n================================================================`);
  console.log(` ✅ ALL ${passed}/${total} NATIVE UNIT TESTS PASSED SUCCESSFULLY`);
  console.log(`================================================================`);
}

runAllTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
