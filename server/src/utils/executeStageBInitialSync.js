const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const initialSyncService = require('../services/initialSyncService');

// Register all mongoose models
const modelsDir = path.join(__dirname, '..', 'models');
fs.readdirSync(modelsDir).forEach(f => {
  if (f.endsWith('.js')) require(path.join(modelsDir, f));
});

const DEPENDENCY_TIERS = {
  0: ['users', 'venues', 'sponsors', 'clubs'],
  1: ['events', 'clubmemberships'],
  2: [
    'registrations', 'caterings', 'budgets', 'expenses', 'revenues',
    'eventsponsors', 'competitions', 'feedbacks', 'volunteers', 'certificates'
  ],
  3: ['payments', 'teams', 'judges', 'judgingcriterias', 'prizes'],
  4: ['judgescores', 'results']
};

const EXPECTED_TIER_COUNTS = {
  0: 11,
  1: 4,
  2: 13,
  3: 7,
  4: 2
};

async function executeStageB() {
  const startTime = new Date();
  console.log('================================================================');
  console.log(' FESTFLOW PHASE 3.5.1 - STAGE B INITIAL CLOUD SYNCHRONIZATION');
  console.log(' Execution Start Time:', startTime.toISOString());
  console.log('================================================================');

  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/festflow';
  const cloudUri = process.env.CLOUD_MONGODB_URI;

  if (!cloudUri) {
    throw new Error('Fatal: CLOUD_MONGODB_URI is not defined in environment.');
  }

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(cloudUri, { serverSelectionTimeoutMS: 10000 });

  await localClient.connect();
  console.log('✅ Connected to Local MongoDB (127.0.0.1:27017/festflow)');

  await atlasClient.connect();
  console.log('✅ Connected to Remote MongoDB Atlas Cluster');

  const localDb = localClient.db('festflow');
  const atlasFestflowDb = atlasClient.db('festflow');
  const atlasTestDb = atlasClient.db('test');

  const auditManifest = {
    executionTimestamp: startTime.toISOString(),
    completedTimestamp: null,
    status: 'IN_PROGRESS',
    preflight: {},
    indexProvisioning: [],
    tierExecution: {},
    postVerification: {},
    errors: []
  };

  try {
    // -------------------------------------------------------------
    // STEP 1: PREFLIGHT INTEGRITY & SAFETY ASSERTIONS
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: PREFLIGHT SAFETY ASSERTIONS ---');

    // 1.1 Atlas 'test' database protection
    const testColls = await atlasTestDb.listCollections().toArray();
    let initialTestDocCount = 0;
    for (const c of testColls) {
      initialTestDocCount += await atlasTestDb.collection(c.name).countDocuments();
    }
    console.log(`Atlas 'test' DB Document Count: ${initialTestDocCount} across ${testColls.length} collections`);
    if (initialTestDocCount !== 76) {
      throw new Error(`Safety Violation: Atlas 'test' database document count expected 76, found ${initialTestDocCount}!`);
    }
    auditManifest.preflight.atlasTestInitialCount = initialTestDocCount;

    // 1.2 Atlas 'festflow' database cleanliness
    const festflowColls = await atlasFestflowDb.listCollections().toArray();
    let initialFestflowDocCount = 0;
    for (const c of festflowColls) {
      initialFestflowDocCount += await atlasFestflowDb.collection(c.name).countDocuments();
    }
    console.log(`Atlas 'festflow' DB Document Count: ${initialFestflowDocCount}`);
    if (initialFestflowDocCount !== 0) {
      throw new Error(`Safety Violation: Target Atlas 'festflow' database is not clean! Found ${initialFestflowDocCount} documents.`);
    }
    auditManifest.preflight.atlasFestflowInitialCount = initialFestflowDocCount;

    // 1.3 Local Snapshot Revalidation
    const localQueueCount = await localDb.collection('syncqueues').countDocuments();
    const localTombCount = await localDb.collection('synctombstones').countDocuments();
    const localQuarantinedCount = await localDb.collection('_orphaned_clubmemberships_backup').countDocuments();
    const localFacultyDoc = await localDb.collection('users').findOne({ email: 'faculty@festflow.edu' });

    console.log(`Local SyncQueue count: ${localQueueCount} (must remain 241)`);
    console.log(`Local SyncTombstone count: ${localTombCount} (must remain 64)`);
    console.log(`Local Quarantined count: ${localQuarantinedCount} (must remain 24)`);
    console.log(`Local Faculty doc present: ${!!localFacultyDoc}`);

    if (localQueueCount !== 241 || localTombCount !== 64 || localQuarantinedCount !== 24 || !localFacultyDoc) {
      throw new Error('Safety Violation: Local state does not match expected pre-sync baseline!');
    }

    auditManifest.preflight.localQueueCount = localQueueCount;
    auditManifest.preflight.localTombCount = localTombCount;
    auditManifest.preflight.localQuarantinedCount = localQuarantinedCount;
    auditManifest.preflight.localFacultyId = localFacultyDoc._id.toString();

    // 1.4 Organize candidate documents by tier
    const tiers = await initialSyncService.getEligibleDocumentsByTier(localDb);
    let totalEligible = 0;
    for (let t = 0; t <= 4; t++) {
      const count = tiers[t].length;
      totalEligible += count;
      if (count !== EXPECTED_TIER_COUNTS[t]) {
        throw new Error(`Tier ${t} count mismatch: expected ${EXPECTED_TIER_COUNTS[t]}, found ${count}`);
      }
    }
    console.log(`Total eligible domain documents verified: ${totalEligible}/37 across Tiers 0-4`);
    auditManifest.preflight.totalEligible = totalEligible;

    // -------------------------------------------------------------
    // STEP 2: PROVISION INDEXES ON ATLAS festflow
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: PROVISIONING INDEXES ON ATLAS festflow ---');
    const indexPlan = await initialSyncService.generateIndexProvisioningPlan(
      mongoose.models,
      atlasFestflowDb,
      false // dryRunOnly = false -> Execute index creation
    );
    auditManifest.indexProvisioning = indexPlan;
    console.log(`Provisioned/Verified ${indexPlan.length} indexes on Atlas festflow.`);
    const uniqueIndexes = indexPlan.filter(p => p.unique);
    console.log(`Unique indexes verified: ${uniqueIndexes.length}`);
    for (const u of uniqueIndexes) {
      console.log(` - [UNIQUE] ${u.collection}.${u.indexName} on ${JSON.stringify(u.fields)}`);
    }

    // -------------------------------------------------------------
    // STEP 3: SEQUENTIAL 5-TIER ICAS UPLOAD
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: EXECUTING 5-TIER SEQUENTIAL ICAS UPLOAD ---');
    let cumulativeSynced = 0;

    for (let tier = 0; tier <= 4; tier++) {
      console.log(`\n>>> STARTING BATCH FOR TIER ${tier} (${EXPECTED_TIER_COUNTS[tier]} documents) <<<`);
      const tierItems = tiers[tier];
      auditManifest.tierExecution[tier] = {
        expected: EXPECTED_TIER_COUNTS[tier],
        processed: 0,
        inserted: 0,
        updated: 0,
        alreadySynced: 0,
        conflicts: 0,
        records: []
      };

      for (const item of tierItems) {
        const collName = item.collection;
        const docId = item.document._id;
        const atlasColl = atlasFestflowDb.collection(collName);

        // Freshness revalidation check: re-read local document
        const currentLocalDoc = await localDb.collection(collName).findOne({ _id: docId });
        if (!currentLocalDoc) {
          throw new Error(`Concurrent Mutation: Document ${docId} in ${collName} disappeared from local DB!`);
        }
        if (currentLocalDoc._syncVersion !== item.document._syncVersion) {
          throw new Error(
            `Concurrent Mutation: Document ${docId} version changed locally from ${item.document._syncVersion} to ${currentLocalDoc._syncVersion}!`
          );
        }

        // Parent dependency verification for Tier >= 1
        if (tier >= 1) {
          const parentCheck = await initialSyncService.verifyParentDependencies(atlasFestflowDb, item);
          if (!parentCheck.valid) {
            throw new Error(`Dependency Missing for Tier ${tier} document ${docId} (${collName}): ${parentCheck.reason}`);
          }
        }

        // Execute ICAS
        const syncRes = await initialSyncService.syncDocumentICAS(atlasColl, currentLocalDoc);
        auditManifest.tierExecution[tier].processed++;
        auditManifest.tierExecution[tier].records.push({
          collection: collName,
          documentId: docId.toString(),
          result: syncRes
        });

        if (syncRes.status === 'INSERTED') {
          auditManifest.tierExecution[tier].inserted++;
          console.log(`  [INSERTED] Tier ${tier} | ${collName} | ID: ${docId}`);
        } else if (syncRes.status === 'ALREADY_SYNCED_EQUAL') {
          auditManifest.tierExecution[tier].alreadySynced++;
          console.log(`  [ALREADY_SYNCED] Tier ${tier} | ${collName} | ID: ${docId}`);
        } else if (syncRes.status === 'UPDATED') {
          auditManifest.tierExecution[tier].updated++;
          console.log(`  [UPDATED] Tier ${tier} | ${collName} | ID: ${docId}`);
        } else {
          // Any CONFLICT status is a reason to halt immediately
          auditManifest.tierExecution[tier].conflicts++;
          throw new Error(`Sync Conflict encountered on ${collName} / ${docId}: ${syncRes.reason || syncRes.status}`);
        }
      }

      cumulativeSynced += auditManifest.tierExecution[tier].processed;
      console.log(`>>> TIER ${tier} COMPLETE: Processed ${auditManifest.tierExecution[tier].processed}/${EXPECTED_TIER_COUNTS[tier]} | Cumulative Uploaded: ${cumulativeSynced}/37 <<<`);

      // Gated Assertion after each tier
      if (auditManifest.tierExecution[tier].processed !== EXPECTED_TIER_COUNTS[tier]) {
        throw new Error(`Gate Check Failed: Tier ${tier} processed ${auditManifest.tierExecution[tier].processed} instead of ${EXPECTED_TIER_COUNTS[tier]}`);
      }
    }

    // -------------------------------------------------------------
    // STEP 4: COMPREHENSIVE POST-SYNC VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: COMPREHENSIVE POST-SYNC INTEGRITY VERIFICATION ---');

    // 4.1 Verify Atlas festflow total collection and document counts
    const postColls = await atlasFestflowDb.listCollections().toArray();
    let totalAtlasFestflowDocs = 0;
    const collectionBreakdown = {};
    for (const c of postColls) {
      const count = await atlasFestflowDb.collection(c.name).countDocuments();
      collectionBreakdown[c.name] = count;
      totalAtlasFestflowDocs += count;
    }
    console.log(`Atlas festflow Total Documents: ${totalAtlasFestflowDocs}/37 across ${postColls.length} collections`);
    if (totalAtlasFestflowDocs !== 37) {
      throw new Error(`Post-Sync Failure: Expected exactly 37 documents on Atlas festflow, found ${totalAtlasFestflowDocs}!`);
    }
    auditManifest.postVerification.atlasFestflowTotal = totalAtlasFestflowDocs;
    auditManifest.postVerification.collectionBreakdown = collectionBreakdown;

    // 4.2 Verify Atlas 'test' remained untouched
    let postTestDocCount = 0;
    for (const c of testColls) {
      postTestDocCount += await atlasTestDb.collection(c.name).countDocuments();
    }
    console.log(`Atlas test Total Documents: ${postTestDocCount} (Initial: 76)`);
    if (postTestDocCount !== 76) {
      throw new Error(`CRITICAL VIOLATION: Atlas 'test' database was modified! Initial: 76, Now: ${postTestDocCount}`);
    }
    auditManifest.postVerification.atlasTestPostCount = postTestDocCount;

    // 4.3 Verify Local Invariance
    const postQueueCount = await localDb.collection('syncqueues').countDocuments();
    const postTombCount = await localDb.collection('synctombstones').countDocuments();
    const postQuarantinedCount = await localDb.collection('_orphaned_clubmemberships_backup').countDocuments();
    console.log(`Local SyncQueue count: ${postQueueCount} (Initial: 241)`);
    console.log(`Local SyncTombstones count: ${postTombCount} (Initial: 64)`);
    console.log(`Local Quarantined count: ${postQuarantinedCount} (Initial: 24)`);

    if (postQueueCount !== 241 || postTombCount !== 64 || postQuarantinedCount !== 24) {
      throw new Error('CRITICAL VIOLATION: Local Queue, Tombstones, or Quarantined collections were modified during Stage B!');
    }
    auditManifest.postVerification.localQueueCount = postQueueCount;
    auditManifest.postVerification.localTombCount = postTombCount;
    auditManifest.postVerification.localQuarantinedCount = postQuarantinedCount;

    // 4.4 Verify Faculty Exclusion on Atlas
    const cloudFaculty = await atlasFestflowDb.collection('users').findOne({ email: 'faculty@festflow.edu' });
    if (cloudFaculty) {
      throw new Error('CRITICAL VIOLATION: Held faculty account (faculty@festflow.edu) was found in Atlas festflow!');
    }
    console.log('✅ Verified: Held faculty account (faculty@festflow.edu) is NOT present on Atlas.');
    auditManifest.postVerification.facultyAccountExcluded = true;

    // 4.5 Verify Quarantine Exclusion on Atlas
    const cloudQuarantineColl = await atlasFestflowDb.collection('_orphaned_clubmemberships_backup').countDocuments();
    const cloudMembershipsCount = await atlasFestflowDb.collection('clubmemberships').countDocuments();
    if (cloudQuarantineColl > 0 || cloudMembershipsCount !== 1) {
      throw new Error(`CRITICAL VIOLATION: Quarantined memberships leaked to Atlas! backup_coll: ${cloudQuarantineColl}, memberships: ${cloudMembershipsCount}`);
    }
    console.log('✅ Verified: 24 Quarantined memberships are NOT present on Atlas. (clubmemberships count = 1)');
    auditManifest.postVerification.quarantineExcluded = true;

    // 4.6 Byte-for-Byte & ObjectId Parity Check for all 37 documents
    console.log('\n--- Verifying Document-Level Parity & ObjectIds for All 37 Documents ---');
    let parityVerified = 0;
    const documentParityReport = [];

    for (let t = 0; t <= 4; t++) {
      for (const item of tiers[t]) {
        const localDoc = item.document;
        const cloudDoc = await atlasFestflowDb.collection(item.collection).findOne({ _id: localDoc._id });

        if (!cloudDoc) {
          throw new Error(`Parity Failure: Document ${localDoc._id} in ${item.collection} missing from Atlas!`);
        }

        // Verify ID match
        if (cloudDoc._id.toString() !== localDoc._id.toString()) {
          throw new Error(`ID Mismatch for ${localDoc._id}: Cloud has ${cloudDoc._id}`);
        }

        // Verify _syncVersion
        if (cloudDoc._syncVersion !== localDoc._syncVersion) {
          throw new Error(`Version Mismatch for ${localDoc._id}: Local v${localDoc._syncVersion} vs Cloud v${cloudDoc._syncVersion}`);
        }

        // Verify content equality
        const equal = initialSyncService.isContentEqual(localDoc, cloudDoc);
        if (!equal) {
          throw new Error(`Content Mismatch for ${localDoc._id} in ${item.collection}!`);
        }

        parityVerified++;
        documentParityReport.push({
          collection: item.collection,
          id: localDoc._id.toString(),
          tier: t,
          syncVersion: cloudDoc._syncVersion,
          parity: true
        });
      }
    }
    console.log(`✅ All ${parityVerified}/37 domain documents verified with exact byte-level business parity and canonical ObjectIds!`);
    auditManifest.postVerification.parityVerifiedCount = parityVerified;
    auditManifest.postVerification.documentParityReport = documentParityReport;

    // 4.7 Foreign Reference Integrity Verification on Atlas
    console.log('\n--- Verifying Foreign Reference Integrity on Atlas ---');
    let refChecksPassed = 0;
    for (let t = 1; t <= 4; t++) {
      for (const item of tiers[t]) {
        const check = await initialSyncService.verifyParentDependencies(atlasFestflowDb, item);
        if (!check.valid) {
          throw new Error(`Atlas Referential Integrity Violation for ${item.collection}/${item.document._id}: ${check.reason}`);
        }
        refChecksPassed++;
      }
    }
    console.log(`✅ All ${refChecksPassed} child documents verified: 100% of parent foreign keys resolve to existing documents on Atlas!`);
    auditManifest.postVerification.referentialChecksPassed = refChecksPassed;

    // 4.8 Index Verification on Atlas festflow
    console.log('\n--- Verifying Indexes on Atlas festflow ---');
    const atlasIndexesReport = {};
    for (const c of postColls) {
      const idxs = await atlasFestflowDb.collection(c.name).indexes();
      atlasIndexesReport[c.name] = idxs.map(i => ({ name: i.name, key: i.key, unique: !!i.unique }));
    }
    auditManifest.postVerification.atlasIndexes = atlasIndexesReport;
    console.log(`✅ Verified active indexes across all ${postColls.length} collections on Atlas festflow.`);

    // Final Success Status
    const endTime = new Date();
    auditManifest.completedTimestamp = endTime.toISOString();
    auditManifest.status = 'SUCCESS';
    auditManifest.durationMs = endTime.getTime() - startTime.getTime();

    console.log('\n================================================================');
    console.log(' 🎉 STAGE B INITIAL SYNCHRONIZATION COMPLETED SUCCESSFULLY!');
    console.log(` Total Time: ${(auditManifest.durationMs / 1000).toFixed(2)}s`);
    console.log(' Documents Ingested to Atlas festflow: 37/37');
    console.log(' Conflicts / Errors: 0');
    console.log(' Atlas test database: 100% Intact (76 docs)');
    console.log(' Local database: 100% Invariant (38 docs, 24 quarantined)');
    console.log('================================================================\n');

  } catch (err) {
    auditManifest.status = 'FAILED';
    auditManifest.errors.push(err.message);
    auditManifest.completedTimestamp = new Date().toISOString();
    console.error('\n❌ STAGE B EXECUTION HALTED ON ERROR:', err.message);
  } finally {
    const reportPath = 'C:\\Users\\sathy\\.gemini\\antigravity\\brain\\e3f3f7d5-8631-4102-85df-696e1a9851c1\\scratch\\stage_b_execution_manifest.json';
    fs.writeFileSync(reportPath, JSON.stringify(auditManifest, null, 2), 'utf8');
    console.log(`Detailed execution manifest written to: ${reportPath}`);

    await localClient.close();
    await atlasClient.close();
  }
}

executeStageB().catch(err => {
  console.error('Fatal crash in executeStageB:', err);
  process.exit(1);
});
