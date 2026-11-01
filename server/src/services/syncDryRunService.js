const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { DEPENDENCY_TIERS } = require('./syncWorkerService');

// Map of unique index fields for collision auditing
const UNIQUE_FIELDS_MAP = {
  users: ['email'],
  clubs: ['name'],
  venues: ['name'],
  certificates: ['certificateNo', 'verificationCode'],
  payments: ['transactionId'],
  registrations: ['ticketNumber'],
  clubmemberships: [['club', 'user']],
  feedbacks: [['event', 'user']],
  volunteers: [['event', 'user']]
};

// Map of parent foreign key references
const PARENT_REFS_MAP = {
  events: [{ field: 'club', collection: 'clubs' }, { field: 'venue', collection: 'venues' }],
  clubmemberships: [{ field: 'club', collection: 'clubs' }, { field: 'user', collection: 'users' }],
  registrations: [{ field: 'event', collection: 'events' }, { field: 'user', collection: 'users' }],
  caterings: [{ field: 'event', collection: 'events' }],
  budgets: [{ field: 'event', collection: 'events' }],
  expenses: [{ field: 'event', collection: 'events' }],
  revenues: [{ field: 'event', collection: 'events' }],
  eventsponsors: [{ field: 'event', collection: 'events' }, { field: 'sponsor', collection: 'sponsors' }],
  competitions: [{ field: 'event', collection: 'events' }],
  feedbacks: [{ field: 'event', collection: 'events' }, { field: 'user', collection: 'users' }],
  volunteers: [{ field: 'event', collection: 'events' }, { field: 'user', collection: 'users' }],
  certificates: [{ field: 'event', collection: 'events' }, { field: 'user', collection: 'users' }],
  payments: [{ field: 'registration', collection: 'registrations' }, { field: 'event', collection: 'events' }],
  teams: [{ field: 'competition', collection: 'competitions' }],
  judges: [{ field: 'competition', collection: 'competitions' }],
  judgingcriterias: [{ field: 'competition', collection: 'competitions' }],
  prizes: [{ field: 'competition', collection: 'competitions' }],
  judgescores: [{ field: 'competition', collection: 'competitions' }, { field: 'team', collection: 'teams' }],
  results: [{ field: 'competition', collection: 'competitions' }, { field: 'team', collection: 'teams' }]
};

class SyncDryRunService {
  /**
   * Executes a 100% read-only audit comparing Local MongoDB and MongoDB Atlas
   */
  async executeDryRun(options = {}) {
    const atlasConn = options.atlasConn || (typeof connectDB.getAtlasConnection === 'function' ? connectDB.getAtlasConnection() : null);

    const report = {
      timestamp: new Date().toISOString(),
      mode: 'READ_ONLY_DRY_RUN',
      atlasConnected: !!atlasConn && atlasConn.readyState === 1,
      atlasHost: atlasConn ? atlasConn.host : 'disconnected',
      atlasDb: atlasConn ? atlasConn.name : 'none',
      summary: {
        totalLocalDocs: 0,
        totalAtlasDocs: 0,
        missingVersionLocally: 0,
        safeToSync: 0,
        idCollisionsSameId: 0,
        uniqueKeyCollisionsDiffId: 0,
        orphanMissingParents: 0,
        requiresManualIntervention: 0
      },
      collections: {}
    };

    const system = new Set(['SyncConflict', 'SyncQueue', 'SyncTombstone']);
    const domainModels = Object.keys(mongoose.models).filter((m) => !system.has(m));

    for (const modelName of domainModels) {
      const localModel = mongoose.models[modelName];
      const collName = localModel.collection.name;

      const collReport = {
        model: modelName,
        localCount: 0,
        atlasCount: 0,
        missingLocalVersion: 0,
        idCollisions: [],
        uniqueKeyViolations: [],
        brokenReferences: [],
        safeCount: 0
      };

      // 1. Fetch all local documents
      const localDocs = await localModel.find({}).lean();
      collReport.localCount = localDocs.length;
      report.summary.totalLocalDocs += localDocs.length;

      // 2. Fetch Atlas stats if connected
      let atlasColl = null;
      if (atlasConn && atlasConn.readyState === 1) {
        atlasColl = atlasConn.collection(collName);
        collReport.atlasCount = await atlasColl.countDocuments();
        report.summary.totalAtlasDocs += collReport.atlasCount;
      }

      // 3. Audit each local document
      for (const doc of localDocs) {
        let isSafe = true;

        if (doc._syncVersion === undefined || doc._syncVersion === null) {
          collReport.missingLocalVersion++;
          report.summary.missingVersionLocally++;
        }

        // A. Check ID collisions on Atlas
        if (atlasColl) {
          const cloudDoc = await atlasColl.findOne({ _id: doc._id });
          if (cloudDoc) {
            report.summary.idCollisionsSameId++;
            collReport.idCollisions.push({
              id: doc._id.toString(),
              localVersion: doc._syncVersion || 1,
              cloudVersion: cloudDoc._syncVersion || 1,
              status: (doc._syncVersion || 1) === (cloudDoc._syncVersion || 1) ? 'EQUAL_VERSION' : 'VERSION_DIFF'
            });
          }

          // B. Check unique key collisions (different ID, same unique field)
          const uniqueFields = UNIQUE_FIELDS_MAP[collName];
          if (uniqueFields) {
            for (const uField of uniqueFields) {
              let query = {};
              if (Array.isArray(uField)) {
                // Compound unique key
                query._id = { $ne: doc._id };
                for (const f of uField) {
                  if (doc[f]) query[f] = doc[f];
                }
              } else {
                if (doc[uField]) {
                  query._id = { $ne: doc._id };
                  query[uField] = doc[uField];
                }
              }

              if (Object.keys(query).length > 1) {
                const conflictDoc = await atlasColl.findOne(query);
                if (conflictDoc) {
                  isSafe = false;
                  report.summary.uniqueKeyCollisionsDiffId++;
                  report.summary.requiresManualIntervention++;
                  collReport.uniqueKeyViolations.push({
                    localId: doc._id.toString(),
                    atlasId: conflictDoc._id.toString(),
                    field: uField,
                    value: typeof uField === 'string' ? doc[uField] : 'compound'
                  });
                }
              }
            }
          }
        }

        // C. Check Parent Foreign Key Integrity
        const parentRefs = PARENT_REFS_MAP[collName];
        if (parentRefs) {
          for (const ref of parentRefs) {
            const parentId = doc[ref.field];
            if (parentId) {
              const targetModel = Object.values(mongoose.models).find(
                (m) => m.collection && m.collection.name === ref.collection
              );
              if (targetModel) {
                const parentExists = await targetModel.exists({ _id: parentId });
                if (!parentExists) {
                  isSafe = false;
                  report.summary.orphanMissingParents++;
                  report.summary.requiresManualIntervention++;
                  collReport.brokenReferences.push({
                    docId: doc._id.toString(),
                    missingField: ref.field,
                    targetCollection: ref.collection,
                    parentId: parentId.toString()
                  });
                }
              }
            }
          }
        }

        if (isSafe) {
          collReport.safeCount++;
          report.summary.safeToSync++;
        }
      }

      report.collections[collName] = collReport;
    }

    return report;
  }
}

module.exports = new SyncDryRunService();
module.exports.SyncDryRunService = SyncDryRunService;
