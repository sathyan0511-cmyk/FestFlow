const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

/**
 * Dependency Tier Mapping across all 23 FestFlow domain collections.
 * Tier 0: Root/Foundational (Users, Venues, Sponsors, Clubs) - Zero dependencies
 * Tier 1: Core Scoped (Events, ClubMemberships)
 * Tier 2: Event Subsystems (Registrations, Caterings, Budgets, Expenses, Revenues, etc.)
 * Tier 3: Secondary Dependent (Payments, Teams, Judges, JudgingCriteria, Prizes)
 * Tier 4: Deep Evaluation (JudgeScores, Results)
 */
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

/**
 * Parent foreign key map for verifying parent existence before child ingestion.
 */
const PARENT_REF_MAP = {
  events: [
    { field: 'club', collection: 'clubs' },
    { field: 'venue', collection: 'venues' }
  ],
  clubmemberships: [
    { field: 'club', collection: 'clubs' },
    { field: 'user', collection: 'users' }
  ],
  registrations: [
    { field: 'event', collection: 'events' },
    { field: 'user', collection: 'users' }
  ],
  caterings: [{ field: 'event', collection: 'events' }],
  budgets: [{ field: 'event', collection: 'events' }],
  expenses: [
    { field: 'event', collection: 'events' },
    { field: 'budget', collection: 'budgets' }
  ],
  revenues: [{ field: 'event', collection: 'events' }],
  eventsponsors: [
    { field: 'event', collection: 'events' },
    { field: 'sponsor', collection: 'sponsors' }
  ],
  competitions: [{ field: 'event', collection: 'events' }],
  feedbacks: [
    { field: 'event', collection: 'events' },
    { field: 'user', collection: 'users' }
  ],
  volunteers: [
    { field: 'event', collection: 'events' },
    { field: 'user', collection: 'users' }
  ],
  certificates: [
    { field: 'event', collection: 'events' },
    { field: 'user', collection: 'users' }
  ],
  payments: [
    { field: 'registration', collection: 'registrations' },
    { field: 'event', collection: 'events' },
    { field: 'user', collection: 'users' }
  ],
  teams: [
    { field: 'event', collection: 'events' },
    { field: 'teamLeader', collection: 'users' }
  ],
  judges: [{ field: 'event', collection: 'events' }],
  judgingcriterias: [{ field: 'competition', collection: 'competitions' }],
  prizes: [{ field: 'competition', collection: 'competitions' }],
  judgescores: [
    { field: 'judge', collection: 'judges' },
    { field: 'team', collection: 'teams' },
    { field: 'competition', collection: 'competitions' }
  ],
  results: [
    { field: 'competition', collection: 'competitions' }
  ]
};

class InitialSyncService {
  constructor() {
    this.logs = [];
    this.syncManifest = {
      startedAt: null,
      completedAt: null,
      tiers: {},
      summary: {
        totalEligible: 37,
        inserted: 0,
        updated: 0,
        alreadySynced: 0,
        conflicts: 0,
        failed: 0
      }
    };
  }

  log(msg, level = 'info') {
    const entry = { timestamp: new Date().toISOString(), level, message: msg };
    this.logs.push(entry);
    if (level === 'error') console.error(`[InitialSyncService] ❌ ${msg}`);
    else if (level === 'warn') console.warn(`[InitialSyncService] ⚠️ ${msg}`);
    else console.log(`[InitialSyncService] ℹ️ ${msg}`);
  }

  /**
   * Helper to evaluate whether two documents have identical business content.
   */
  isContentEqual(docA, docB) {
    if (!docA || !docB) return false;
    const ignoreKeys = new Set(['createdAt', 'updatedAt', '__v']);
    const keysA = Object.keys(docA).filter((k) => !ignoreKeys.has(k));
    const keysB = Object.keys(docB).filter((k) => !ignoreKeys.has(k));

    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      const valA = JSON.stringify(docA[k]);
      const valB = JSON.stringify(docB[k]);
      if (valA !== valB) return false;
    }
    return true;
  }

  /**
   * Extract all 37 eligible documents from local MongoDB organized by tier.
   * Excludes:
   * 1. 24 Quarantined memberships in _orphaned_clubmemberships_backup
   * 2. 1 Held faculty profile (faculty@festflow.edu)
   */
  async getEligibleDocumentsByTier(localDb) {
    const tierMap = {};
    let totalFound = 0;

    for (let tier = 0; tier <= 4; tier++) {
      tierMap[tier] = [];
      const collections = DEPENDENCY_TIERS[tier];

      for (const collName of collections) {
        let query = {};
        // Strict Exclusion 1: Faculty account on hold
        if (collName === 'users') {
          query = { email: { $ne: 'faculty@festflow.edu' } };
        }

        const docs = await localDb.collection(collName).find(query).toArray();
        for (const doc of docs) {
          tierMap[tier].push({
            collection: collName,
            tier,
            document: doc
          });
          totalFound++;
        }
      }
    }

    if (totalFound !== 37) {
      throw new Error(`Integrity Check Failed: Expected exactly 37 eligible documents, but found ${totalFound}!`);
    }

    return tierMap;
  }

  /**
   * Safe Inspect-and-Compare-and-Swap (ICAS) Synchronization Algorithm.
   * Handles all cloud states without throwing duplicate-key errors.
   */
  async syncDocumentICAS(atlasColl, localDoc) {
    const localVer = localDoc._syncVersion !== undefined ? localDoc._syncVersion : 1;
    const documentId = localDoc._id;

    // STEP 1: Inspect cloud document
    let cloudDoc = null;
    try {
      cloudDoc = await atlasColl.findOne({ _id: documentId });
    } catch (err) {
      throw new Error(`Failed to query Atlas document ${documentId}: ${err.message}`);
    }

    // CASE A: Document does NOT exist on Atlas -> Insert via insertOne()
    if (!cloudDoc) {
      try {
        await atlasColl.insertOne(localDoc);
        return {
          status: 'INSERTED',
          action: 'INSERT',
          documentId,
          version: localVer,
          message: `Document inserted successfully under canonical ID ${documentId} (v${localVer})`
        };
      } catch (insertErr) {
        if (insertErr.code === 11000) {
          // Duplicate key race condition: re-read and evaluate
          const reReadDoc = await atlasColl.findOne({ _id: documentId });
          if (reReadDoc) {
            return this.evaluateCloudVsLocal(atlasColl, localDoc, reReadDoc);
          }
        }
        throw insertErr;
      }
    }

    // CASE B: Document already exists on Atlas -> Evaluate versions
    return this.evaluateCloudVsLocal(atlasColl, localDoc, cloudDoc);
  }

  /**
   * Compares Cloud vs Local document versions and executes atomic CAS update if safe.
   */
  async evaluateCloudVsLocal(atlasColl, localDoc, cloudDoc) {
    const documentId = localDoc._id;
    const localVer = localDoc._syncVersion !== undefined ? localDoc._syncVersion : 1;
    const cloudVer = cloudDoc._syncVersion !== undefined ? cloudDoc._syncVersion : 1;

    // 1. Cloud is strictly newer -> STALE LOCAL SNAPSHOT DETECTED
    if (cloudVer > localVer) {
      return {
        status: 'CONFLICT_CLOUD_NEWER',
        action: 'PRESERVE_CLOUD',
        documentId,
        localVer,
        cloudVer,
        reason: `Atlas version (v${cloudVer}) is strictly newer than local version (v${localVer}). Overwrite rejected.`
      };
    }

    // 2. Cloud has identical version
    if (cloudVer === localVer) {
      const identical = this.isContentEqual(localDoc, cloudDoc);
      if (identical) {
        return {
          status: 'ALREADY_SYNCED_EQUAL',
          action: 'IDEMPOTENT_NOOP',
          documentId,
          localVer,
          cloudVer,
          message: `Document is already synchronized with identical content (v${localVer})`
        };
      } else {
        return {
          status: 'CONFLICT_EQUAL_VERSION_DIFF_CONTENT',
          action: 'FLAG_CONFLICT',
          documentId,
          localVer,
          cloudVer,
          reason: `Document exists on Atlas with equal version (v${localVer}) but divergent business content.`
        };
      }
    }

    // 3. Local is newer -> Atomic Compare-and-Swap Update
    const updateRes = await atlasColl.updateOne(
      { _id: documentId, _syncVersion: cloudVer }, // Atomic precondition guard
      { $set: localDoc }
    );

    if (updateRes.matchedCount === 0) {
      return {
        status: 'CONFLICT_CONCURRENT_WRITE',
        action: 'CONCURRENT_MODIFICATION_DETECTED',
        documentId,
        localVer,
        cloudVer,
        reason: `Concurrent write modified Atlas document (expected v${cloudVer}) during CAS execution.`
      };
    }

    return {
      status: 'UPDATED',
      action: 'UPDATE_CAS',
      documentId,
      localVer,
      cloudVer,
      message: `Document updated conditionally from v${cloudVer} to v${localVer}`
    };
  }

  /**
   * Verifies that all required parent documents exist on Atlas before child upload.
   */
  async verifyParentDependencies(atlasDb, childItem) {
    const collName = childItem.collection;
    const doc = childItem.document;
    const rules = PARENT_REF_MAP[collName] || [];

    for (const rule of rules) {
      const parentId = doc[rule.field];
      if (parentId) {
        const parentDoc = await atlasDb.collection(rule.collection).findOne(
          { _id: parentId },
          { projection: { _id: 1 } }
        );
        if (!parentDoc) {
          return {
            valid: false,
            field: rule.field,
            targetCollection: rule.collection,
            parentId: parentId.toString(),
            reason: `Required parent document ${parentId} in '${rule.collection}' not found in Atlas.`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Audits model schema indexes and produces a provisioning plan.
   * If dryRunOnly is true, does not mutate Atlas.
   */
  async generateIndexProvisioningPlan(mongooseModels, atlasDb, dryRunOnly = true) {
    const plan = [];

    for (const [name, model] of Object.entries(mongooseModels)) {
      if (['SyncQueue', 'SyncTombstone', 'SyncConflict'].includes(name)) continue;
      const collName = model.collection.name;

      const schemaIndexes = model.schema.indexes();
      const existingIndexes = [];

      try {
        const coll = atlasDb.collection(collName);
        const idxList = await coll.indexes();
        existingIndexes.push(...idxList.map((i) => i.name));
      } catch (_) {
        // Collection does not exist yet on Atlas (empty DB)
      }

      for (const [fields, options] of schemaIndexes) {
        const opt = options || {};
        const idxName = opt.name || Object.keys(fields).map((k) => `${k}_${fields[k]}`).join('_');
        const exists = existingIndexes.includes(idxName);

        plan.push({
          collection: collName,
          model: name,
          indexName: idxName,
          fields,
          unique: !!opt.unique,
          sparse: !!opt.sparse,
          status: exists ? 'ALREADY_EXISTS' : 'PROVISION_REQUIRED'
        });

        if (!exists && !dryRunOnly) {
          const coll = atlasDb.collection(collName);
          await coll.createIndex(fields, opt);
        }
      }
    }

    return plan;
  }

  /**
   * Evaluates historical tombstones against clean Atlas database using Rule 1 (Absent from Cloud).
   */
  async evaluateTombstonesRule1(localDb, atlasDb, dryRunOnly = true) {
    const tombstones = await localDb.collection('synctombstones').find({}).toArray();
    const evaluation = [];

    for (const t of tombstones) {
      let cloudDoc = null;
      try {
        cloudDoc = await atlasDb.collection(t.collectionName).findOne({ _id: t.documentId });
      } catch (_) {}

      if (!cloudDoc) {
        evaluation.push({
          tombstoneId: t._id.toString(),
          collection: t.collectionName,
          documentId: t.documentId.toString(),
          ruleApplied: 'RULE_1_ABSENT_FROM_CLOUD',
          action: 'ARCHIVE_WITHOUT_CLOUD_DELETE',
          safeToReconcile: true
        });
      } else {
        evaluation.push({
          tombstoneId: t._id.toString(),
          collection: t.collectionName,
          documentId: t.documentId.toString(),
          ruleApplied: 'RULE_2_EXISTS_IN_CLOUD',
          action: 'REQUIRES_CLOUD_DELETE',
          safeToReconcile: false
        });
      }
    }

    return evaluation;
  }
}

module.exports = new InitialSyncService();
module.exports.InitialSyncService = InitialSyncService;
