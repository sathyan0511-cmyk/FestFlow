const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function auditQueueAndTombstones() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('festflow');

  console.log('--- 1. AUDITING 241 SYNCQUEUE JOBS ---');
  const allJobs = await db.collection('syncqueues').find({}).toArray();
  console.log(`Total SyncQueue jobs found: ${allJobs.length}`);

  const statusDist = {};
  const opDist = {};
  const collDist = {};
  
  let refersToActive = 0;
  let refersToQuarantine = 0;
  let refersToDeletedOrNonexistent = 0;
  let staleOrOldVersion = 0;
  let duplicates = 0;

  // Track unique docId + collection combinations to find duplicates
  const seenDocColls = new Map();

  const jobDetails = [];

  for (const job of allJobs) {
    statusDist[job.status] = (statusDist[job.status] || 0) + 1;
    opDist[job.operation] = (opDist[job.operation] || 0) + 1;
    collDist[job.collectionName] = (collDist[job.collectionName] || 0) + 1;

    const docCollKey = `${job.collectionName}:${job.documentId.toString()}`;
    if (!seenDocColls.has(docCollKey)) {
      seenDocColls.set(docCollKey, []);
    }
    seenDocColls.get(docCollKey).push(job);

    // Check if doc exists in active collection
    let activeDoc = null;
    try {
      activeDoc = await db.collection(job.collectionName).findOne({ _id: job.documentId });
    } catch (_) {}

    // Check if doc exists in quarantine
    let quarantineDoc = null;
    if (job.collectionName === 'clubmemberships') {
      quarantineDoc = await db.collection('_orphaned_clubmemberships_backup').findOne({ _id: job.documentId });
    }

    let docState = 'nonexistent';
    let isOlderVersion = false;

    if (activeDoc) {
      docState = 'active';
      refersToActive++;
      if (job.documentVersion !== undefined && activeDoc._syncVersion !== undefined) {
        if (job.documentVersion < activeDoc._syncVersion) {
          isOlderVersion = true;
          staleOrOldVersion++;
        }
      }
    } else if (quarantineDoc) {
      docState = 'quarantined';
      refersToQuarantine++;
    } else {
      docState = 'deleted_or_nonexistent';
      refersToDeletedOrNonexistent++;
    }

    jobDetails.push({
      id: job._id.toString(),
      collection: job.collectionName,
      documentId: job.documentId.toString(),
      operation: job.operation,
      status: job.status,
      version: job.documentVersion,
      docState,
      isOlderVersion,
      retryCount: job.retryCount,
      hasPayload: !!job.payload,
      createdAt: job.createdAt
    });
  }

  // Count duplicates
  let duplicateGroups = 0;
  for (const [key, jobs] of seenDocColls.entries()) {
    if (jobs.length > 1) {
      duplicateGroups++;
      duplicates += (jobs.length - 1);
    }
  }

  console.log('Status Distribution:', statusDist);
  console.log('Operation Distribution:', opDist);
  console.log('Collection Distribution:', collDist);
  console.log(`Refers to active docs: ${refersToActive}`);
  console.log(`Refers to quarantined docs: ${refersToQuarantine}`);
  console.log(`Refers to deleted/nonexistent docs: ${refersToDeletedOrNonexistent}`);
  console.log(`Stale/older version payloads: ${staleOrOldVersion}`);
  console.log(`Duplicate jobs in queue: ${duplicates} across ${duplicateGroups} document groups`);

  console.log('\n--- 2. AUDITING 64 SYNCTOMBSTONES ---');
  const allTombstones = await db.collection('synctombstones').find({}).toArray();
  console.log(`Total SyncTombstones found: ${allTombstones.length}`);

  const tombstoneCollDist = {};
  let tombstonesPointingToActive = 0;
  let tombstonesPointingToQuarantine = 0;
  let tombstonesPointingToNonexistent = 0;

  const tombstoneDetails = [];

  for (const t of allTombstones) {
    tombstoneCollDist[t.collectionName] = (tombstoneCollDist[t.collectionName] || 0) + 1;

    let activeDoc = null;
    try {
      activeDoc = await db.collection(t.collectionName).findOne({ _id: t.documentId });
    } catch (_) {}

    let quarantineDoc = null;
    if (t.collectionName === 'clubmemberships') {
      quarantineDoc = await db.collection('_orphaned_clubmemberships_backup').findOne({ _id: t.documentId });
    }

    let targetState = 'nonexistent';
    if (activeDoc) {
      targetState = 'active_exists';
      tombstonesPointingToActive++;
    } else if (quarantineDoc) {
      targetState = 'quarantined';
      tombstonesPointingToQuarantine++;
    } else {
      targetState = 'genuinely_deleted';
      tombstonesPointingToNonexistent++;
    }

    tombstoneDetails.push({
      id: t._id.toString(),
      collection: t.collectionName,
      documentId: t.documentId.toString(),
      deletedVersion: t.deletedVersion,
      deletedAt: t.deletedAt,
      syncedToCloud: t.syncedToCloud,
      targetState
    });
  }

  console.log('Tombstones Collection Distribution:', tombstoneCollDist);
  console.log(`Tombstones pointing to active docs: ${tombstonesPointingToActive}`);
  console.log(`Tombstones pointing to quarantined docs: ${tombstonesPointingToQuarantine}`);
  console.log(`Tombstones pointing to genuinely deleted docs: ${tombstonesPointingToNonexistent}`);

  const auditOutput = {
    syncQueueSummary: {
      total: allJobs.length,
      statusDist,
      opDist,
      collDist,
      refersToActive,
      refersToQuarantine,
      refersToDeletedOrNonexistent,
      staleOrOldVersion,
      duplicates,
      duplicateGroups
    },
    tombstonesSummary: {
      total: allTombstones.length,
      tombstoneCollDist,
      tombstonesPointingToActive,
      tombstonesPointingToQuarantine,
      tombstonesPointingToNonexistent
    },
    jobDetails,
    tombstoneDetails
  };

  const brainScratch = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch';
  fs.writeFileSync(path.join(brainScratch, 'queue_and_tombstones_audit.json'), JSON.stringify(auditOutput, null, 2), 'utf8');
  console.log(`\nAudit saved to scratch/queue_and_tombstones_audit.json`);

  await client.close();
}

auditQueueAndTombstones().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
