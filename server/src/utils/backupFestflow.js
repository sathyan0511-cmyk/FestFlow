const path = require('path');
const fs = require('fs');
const { MongoClient, BSON } = require('mongodb');

async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = 'C:\\Users\\sathy\\FestFlow\\backups';
  const backupDirName = `backup_${timestamp}_phase3_4_3`;
  const backupPath = path.join(backupRoot, backupDirName, 'festflow');

  if (fs.existsSync(backupPath)) {
    throw new Error(`Backup directory already exists: ${backupPath}`);
  }
  fs.mkdirSync(backupPath, { recursive: true });

  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('festflow');

  const collections = await db.listCollections().toArray();
  const manifest = {
    timestamp: new Date().toISOString(),
    database: 'festflow',
    collections: {},
    totalDocuments: 0
  };

  console.log(`🚀 Starting full BSON backup of database 'festflow' to:`);
  console.log(`   ${backupPath}`);

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = db.collection(collName);
    const docs = await coll.find({}).toArray();
    const indexes = await coll.indexes();

    // 1. Serialize all documents to binary BSON
    const bsonBuffers = docs.map((doc) => BSON.serialize(doc));
    const fullBsonBuffer = Buffer.concat(bsonBuffers);
    const bsonFile = path.join(backupPath, `${collName}.bson`);
    fs.writeFileSync(bsonFile, fullBsonBuffer);

    // 2. Write metadata and index specifications
    const metadata = {
      name: collName,
      options: collInfo.options || {},
      indexes,
      documentCount: docs.length
    };
    const metaFile = path.join(backupPath, `${collName}.metadata.json`);
    fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2), 'utf8');

    manifest.collections[collName] = {
      documentCount: docs.length,
      bsonBytes: fullBsonBuffer.length,
      indexesCount: indexes.length
    };
    manifest.totalDocuments += docs.length;
    console.log(`   📦 Backed up '${collName}': ${docs.length} docs (${fullBsonBuffer.length} bytes)`);
  }

  // 3. Write manifest.json
  fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // 4. Verify Backup Integrity by deserializing every single BSON file
  console.log('\n🔍 Verifying BSON backup integrity...');
  for (const collName of Object.keys(manifest.collections)) {
    const expected = manifest.collections[collName];
    const bsonFile = path.join(backupPath, `${collName}.bson`);
    const buffer = fs.readFileSync(bsonFile);

    let offset = 0;
    const deserializedDocs = [];
    while (offset < buffer.length) {
      const docSize = buffer.readInt32LE(offset);
      const subBuf = buffer.subarray(offset, offset + docSize);
      const doc = BSON.deserialize(subBuf);
      deserializedDocs.push(doc);
      offset += docSize;
    }

    if (deserializedDocs.length !== expected.documentCount) {
      throw new Error(`Verification mismatch for '${collName}': expected ${expected.documentCount}, got ${deserializedDocs.length}`);
    }
  }

  // 5. Generate self-contained restoration script in the backup directory
  const restoreScriptContent = `
const fs = require('fs');
const path = require('path');
const { MongoClient, BSON } = require('mongodb');

async function restoreDatabase() {
  const uri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('festflow');

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  console.log('Restoring festflow from backup:', manifest.timestamp);

  for (const collName of Object.keys(manifest.collections)) {
    const bsonFile = path.join(__dirname, collName + '.bson');
    const buffer = fs.readFileSync(bsonFile);

    let offset = 0;
    const docs = [];
    while (offset < buffer.length) {
      const docSize = buffer.readInt32LE(offset);
      const doc = BSON.deserialize(buffer.subarray(offset, offset + docSize));
      docs.push(doc);
      offset += docSize;
    }

    const coll = db.collection(collName);
    await coll.deleteMany({});
    if (docs.length > 0) {
      await coll.insertMany(docs);
    }
    console.log('Restored', collName + ':', docs.length, 'docs');
  }

  await client.close();
  console.log('Restoration complete!');
}

restoreDatabase().catch(err => { console.error('Restoration failed:', err); process.exit(1); });
`;
  fs.writeFileSync(path.join(backupPath, 'restore.js'), restoreScriptContent, 'utf8');

  console.log(`\n✅ Backup verified successfully! Total: ${manifest.totalDocuments} documents across ${Object.keys(manifest.collections).length} collections.`);
  console.log(`   Backup location: ${backupPath}`);
  console.log(`   Restoration script: ${path.join(backupPath, 'restore.js')}`);

  await client.close();
  return { backupPath, manifest };
}

if (require.main === module) {
  performBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Backup failed:', err);
      process.exit(1);
    });
}

module.exports = performBackup;
