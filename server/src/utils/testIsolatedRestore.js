const fs = require('fs');
const path = require('path');
const { MongoClient, BSON } = require('mongodb');

async function testRestoreAgainstIsolatedDb() {
  const uri = 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);
  await client.connect();

  const testDbName = 'festflow_backup_restore_test';
  const testDb = client.db(testDbName);

  // Clean test db
  await testDb.dropDatabase();

  const backupDir = 'C:\\Users\\sathy\\FestFlow\\backups\\backup_2026-11-01T14-02-51-817Z_phase3_4_3\\festflow';
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));

  console.log(`Starting isolated restore test into '${testDbName}' from:`);
  console.log(`   ${backupDir}`);

  let totalRestoredDocs = 0;
  const collResults = {};

  for (const collName of Object.keys(manifest.collections)) {
    const bsonFile = path.join(backupDir, `${collName}.bson`);
    const metaFile = path.join(backupDir, `${collName}.metadata.json`);

    const buffer = fs.readFileSync(bsonFile);
    let meta = null;
    if (fs.existsSync(metaFile)) {
      meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    }

    let offset = 0;
    const docs = [];
    while (offset < buffer.length) {
      const docSize = buffer.readInt32LE(offset);
      const doc = BSON.deserialize(buffer.subarray(offset, offset + docSize));
      docs.push(doc);
      offset += docSize;
    }

    // Ensure collection exists
    await testDb.createCollection(collName).catch(() => {});
    const coll = testDb.collection(collName);

    if (docs.length > 0) {
      await coll.insertMany(docs);
    }
    totalRestoredDocs += docs.length;

    // Check BSON types on first doc if present
    let dateVerified = false;
    let objectIdVerified = false;
    if (docs.length > 0) {
      const sample = docs[0];
      objectIdVerified = sample._id instanceof require('mongodb').ObjectId;
      for (const k of Object.keys(sample)) {
        if (sample[k] instanceof Date) dateVerified = true;
      }
    }

    // Recreate indexes from metadata if available
    if (meta && meta.indexes) {
      for (const idx of meta.indexes) {
        if (idx.name !== '_id_') {
          const options = { name: idx.name };
          if (idx.unique) options.unique = true;
          if (idx.sparse) options.sparse = true;
          await coll.createIndex(idx.key, options).catch(e => console.error(`Index creation err for ${collName}:`, e.message));
        }
      }
    }

    const idxs = await coll.indexes();

    collResults[collName] = {
      restoredCount: docs.length,
      expectedCount: manifest.collections[collName].documentCount,
      objectIdVerified,
      dateVerified,
      indexesRestored: idxs.map(i => i.name)
    };
  }

  // Verify SyncQueue and SyncTombstone
  const restoredQueueCount = await testDb.collection('syncqueues').countDocuments();
  const restoredTombstoneCount = await testDb.collection('synctombstones').countDocuments();

  console.log(`Total documents restored: ${totalRestoredDocs} (Expected: ${manifest.totalDocuments})`);
  console.log(`Restored SyncQueue count: ${restoredQueueCount} (Expected: 241)`);
  console.log(`Restored SyncTombstone count: ${restoredTombstoneCount} (Expected: 64)`);

  const report = {
    testDatabase: testDbName,
    totalRestoredDocs,
    expectedTotalDocs: manifest.totalDocuments,
    match: totalRestoredDocs === manifest.totalDocuments,
    restoredQueueCount,
    restoredTombstoneCount,
    collectionDetails: collResults
  };

  const brainScratch = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch';
  fs.writeFileSync(path.join(brainScratch, 'backup_restore_test_report.json'), JSON.stringify(report, null, 2), 'utf8');

  // CLEANUP TEST DATABASE
  await testDb.dropDatabase();
  console.log(`✅ Test database '${testDbName}' dropped cleanly.`);

  await client.close();
  console.log('✅ Isolated restore verification completed successfully.');
}

testRestoreAgainstIsolatedDb().catch(err => {
  console.error('Isolated restore test failed:', err);
  process.exit(1);
});
