const connectDB = require('../config/db');
const SyncQueue = require('../models/SyncQueue');
const syncQueueService = require('./syncQueueService');

/**
 * Dependency Tier Mapping across all 23 FestFlow domain collections.
 * Tier 0 represents root/foundational records with zero dependencies or mutual references.
 * Tiers 1-4 represent increasingly dependent child records.
 */
const DEPENDENCY_TIERS = {
  // Tier 0: Root & Independent Entities
  venues: 0,
  sponsors: 0,
  users: 0,
  clubs: 0,

  // Tier 1: Core Scoped Entities
  events: 1,
  clubmemberships: 1,

  // Tier 2: Event Subsystems
  registrations: 2,
  caterings: 2,
  budgets: 2,
  expenses: 2,
  revenues: 2,
  eventsponsors: 2,
  competitions: 2,
  feedbacks: 2,
  volunteers: 2,
  certificates: 2,

  // Tier 3: Secondary Dependent Entities
  payments: 3,
  teams: 3,
  judges: 3,
  judgingcriterias: 3,
  prizes: 3,

  // Tier 4: Deep Evaluation Entities
  judgescores: 4,
  results: 4
};

const getPrefixAndBase = (collectionName) => {
  if (!collectionName) return { prefix: '', base: '' };
  for (const domainColl of Object.keys(DEPENDENCY_TIERS)) {
    if (collectionName.endsWith(domainColl)) {
      const prefix = collectionName.slice(0, collectionName.length - domainColl.length);
      return { prefix, base: domainColl };
    }
  }
  return { prefix: '', base: collectionName };
};

const getDependencyTier = (collectionName) => {
  if (!collectionName) return 99;
  const { base } = getPrefixAndBase(collectionName);
  if (DEPENDENCY_TIERS[base] !== undefined) return DEPENDENCY_TIERS[base];
  return DEPENDENCY_TIERS[collectionName] !== undefined ? DEPENDENCY_TIERS[collectionName] : 99;
};

/**
 * Foreign key parent reference map for dependent domain collections.
 * Root entities (Tier 0: users, clubs, venues, sponsors) have no required parent checks,
 * eliminating circular deadlocks between users and clubs.
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
  expenses: [{ field: 'event', collection: 'events' }],
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
    { field: 'competition', collection: 'competitions' }
  ],
  judges: [{ field: 'competition', collection: 'competitions' }],
  judgingcriterias: [{ field: 'competition', collection: 'competitions' }],
  prizes: [{ field: 'competition', collection: 'competitions' }],
  judgescores: [
    { field: 'competition', collection: 'competitions' },
    { field: 'team', collection: 'teams' }
  ],
  results: [
    { field: 'competition', collection: 'competitions' },
    { field: 'team', collection: 'teams' }
  ]
};

class SyncWorkerService {
  constructor(options = {}) {
    this.options = options;
    this.isRunning = false;
    this.isProcessingBatch = false;
    this.pollTimer = null;
    this.lastSyncTime = null;
    this.lastError = null;
    this.lastActivity = null;
    this.totalSyncedCount = 0;
    this.totalFailedCount = 0;

    // Test overrides / mock injection
    this.customAtlasConn = options.atlasConn || null;
    this.customIsConnected = options.isAtlasConnected || null;
  }

  /**
   * Resolves runtime configuration settings
   */
  getConfig() {
    const isOffline = this.options.isOfflineMode !== undefined
      ? this.options.isOfflineMode
      : (typeof connectDB.isOfflineMode === 'function' ? connectDB.isOfflineMode() : true);

    const envEnabled = process.env.ENABLE_CLOUD_SYNC;
    
    // In direct cloud mode (Render/production), sync worker is ALWAYS disabled
    let enabled = isOffline;
    if (envEnabled !== undefined) {
      enabled = enabled && envEnabled !== 'false' && envEnabled !== false;
    }
    if (this.options.enabled !== undefined) {
      enabled = this.options.enabled;
    }

    return {
      enabled,
      isOffline,
      syncIntervalMs: this.options.syncIntervalMs || parseInt(process.env.SYNC_INTERVAL_MS, 10) || 5000,
      batchSize: this.options.batchSize || parseInt(process.env.SYNC_BATCH_SIZE, 10) || 25,
      maxRetries: this.options.maxRetries || parseInt(process.env.SYNC_MAX_RETRIES, 10) || 5,
      staleLockTimeoutMs: this.options.staleLockTimeoutMs || 300000 // 5 minutes
    };
  }

  /**
   * Checks whether the secondary MongoDB Atlas connection is currently ready
   */
  isAtlasReady() {
    if (this.customIsConnected) {
      return this.customIsConnected();
    }
    if (typeof connectDB.isAtlasConnected === 'function') {
      return connectDB.isAtlasConnected();
    }
    return false;
  }

  /**
   * Returns the secondary MongoDB Atlas connection instance
   */
  getAtlasConnection() {
    let conn = this.customAtlasConn;
    if (!conn && typeof connectDB.getAtlasConnection === 'function') {
      conn = connectDB.getAtlasConnection();
    }
    const targetDb = this.options.targetDatabase || process.env.CLOUD_DB_NAME || 'festflow';
    if (conn && typeof conn.useDb === 'function') {
      return conn.useDb(targetDb);
    }
    return conn || null;
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
   * Starts the background synchronization worker
   */
  async start() {
    const config = this.getConfig();

    if (!config.enabled) {
      console.log('ℹ️ SyncWorker: Disabled by configuration or running in Direct Cloud mode.');
      return false;
    }

    if (this.isRunning) {
      return true;
    }

    this.isRunning = true;
    this.lastActivity = new Date();
    console.log(`🚀 SyncWorker: Started with interval ${config.syncIntervalMs}ms, batch size ${config.batchSize}`);

    // Recover any stale processing jobs from previous unexpected crashes
    try {
      const recovered = await syncQueueService.recoverStaleProcessingJobs(config.staleLockTimeoutMs);
      if (recovered > 0) {
        console.log(`🔄 SyncWorker: Recovered ${recovered} stale processing jobs to pending state.`);
      }
    } catch (err) {
      console.warn('⚠️ SyncWorker: Stale job recovery warning:', err.message);
    }

    // Schedule recursive polling
    this.scheduleNextPoll(config.syncIntervalMs);
    return true;
  }

  /**
   * Schedules the next polling execution
   */
  scheduleNextPoll(delayMs) {
    if (!this.isRunning) return;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }

    this.pollTimer = setTimeout(async () => {
      this.pollTimer = null;
      if (!this.isRunning) return;

      try {
        await this.processBatch();
      } catch (err) {
        this.lastError = err.message;
        console.warn('⚠️ SyncWorker: Error during batch run:', err.message);
      } finally {
        if (this.isRunning) {
          this.scheduleNextPoll(this.getConfig().syncIntervalMs);
        }
      }
    }, delayMs);

    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  /**
   * Gracefully stops the worker
   */
  async stop() {
    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait if a batch is currently executing
    let waitCount = 0;
    while (this.isProcessingBatch && waitCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitCount++;
    }

    console.log('🛑 SyncWorker: Gracefully stopped.');
    return true;
  }

  /**
   * Processes a single batch of pending synchronization jobs
   */
  async processBatch(batchOptions = {}) {
    const config = this.getConfig();
    if (!config.enabled) {
      return { processed: 0, skipped: 'disabled' };
    }

    if (this.isProcessingBatch) {
      return { processed: 0, skipped: 'in_progress' };
    }

    this.isProcessingBatch = true;
    this.lastActivity = new Date();

    const summary = {
      scanned: 0,
      processed: 0,
      synced: 0,
      failed: 0,
      conflicts: 0,
      deferred: 0,
      errors: []
    };

    try {
      // 1. Verify Atlas connection availability
      if (!this.isAtlasReady()) {
        return { ...summary, skipped: 'atlas_disconnected' };
      }

      const atlasConn = this.getAtlasConnection();
      if (!atlasConn) {
        return { ...summary, skipped: 'no_atlas_connection' };
      }

      // 2. Query eligible pending jobs
      const query = { status: 'pending' };
      if (this.options.collectionFilter) {
        query.collectionName = this.options.collectionFilter;
      }
      if (batchOptions && batchOptions.collectionName) {
        query.collectionName = batchOptions.collectionName;
      }

      const pendingJobs = await SyncQueue.find(query)
        .sort({ createdAt: 1, version: 1 })
        .limit(config.batchSize * 2) // Fetch larger window to sort by dependency tier
        .lean();

      if (!pendingJobs || pendingJobs.length === 0) {
        return summary;
      }

      // 3. Sort pending jobs by Dependency Tier ascending, then createdAt ascending
      pendingJobs.sort((a, b) => {
        const tierA = getDependencyTier(a.collectionName);
        const tierB = getDependencyTier(b.collectionName);
        if (tierA !== tierB) return tierA - tierB;
        if (a.createdAt && b.createdAt) {
          const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (diff !== 0) return diff;
        }
        return (a.version || 1) - (b.version || 1);
      });

      // Slice to configured batch size
      const batchToProcess = pendingJobs.slice(0, config.batchSize);
      summary.scanned = batchToProcess.length;

      // Track failed parent document IDs in this batch to prevent uploading dependent children
      const failedParentDocIds = new Set();
      const failedCollections = new Set();

      // 4. Process each job in dependency order
      for (const rawJob of batchToProcess) {
        summary.processed++;

        // Dependency protection across batches & within batch:
        // Dependent entities (Tier > 0) cannot be uploaded before their required parents exist on Atlas
        const tier = getDependencyTier(rawJob.collectionName);
        if (tier > 0) {
          const isReady = await this.isParentReadyForChild(rawJob, atlasConn, failedParentDocIds);
          if (!isReady) {
            summary.deferred++;
            continue; // Leave in pending status for subsequent polling cycle
          }
        }

        // Atomically claim the job
        const claimedJob = await syncQueueService.claimPendingJob(rawJob._id);
        if (!claimedJob) {
          // Another worker claimed or job status changed
          continue;
        }

        try {
          const uploadResult = await this.uploadJobToAtlas(claimedJob, atlasConn);

          if (uploadResult.status === 'synced') {
            await syncQueueService.updateJobStatus(claimedJob._id, 'synced');
            summary.synced++;
            this.totalSyncedCount++;
            this.lastSyncTime = new Date();
          } else if (uploadResult.status === 'conflict') {
            await syncQueueService.updateJobStatus(
              claimedJob._id,
              'conflict',
              uploadResult.reason || 'Cloud version is newer than local version'
            );
            summary.conflicts++;
            failedParentDocIds.add(claimedJob.documentId.toString());
            failedCollections.add(claimedJob.collectionName);
          }
        } catch (uploadErr) {
          summary.failed++;
          this.totalFailedCount++;
          this.lastError = uploadErr.message;
          summary.errors.push({ jobId: claimedJob._id, error: uploadErr.message });

          failedParentDocIds.add(claimedJob.documentId.toString());
          failedCollections.add(claimedJob.collectionName);

          const currentRetries = (claimedJob.retryCount || 0) + 1;
          if (currentRetries >= config.maxRetries) {
            await syncQueueService.updateJobStatus(
              claimedJob._id,
              'failed',
              `Exceeded max retries (${config.maxRetries}): ${uploadErr.message}`
            );
          } else {
            // Revert to pending for retry on subsequent poll
            await syncQueueService.updateJobStatus(claimedJob._id, 'pending', uploadErr.message);
          }
        }
      }

      return summary;
    } catch (err) {
      this.lastError = err.message;
      throw err;
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Evaluates foreign-key parent dependencies across batches and within the current batch.
   * Prevents child records from uploading when their parent is missing from Atlas,
   * is pending in another batch, or has failed.
   */
  async isParentReadyForChild(job, atlasConn, failedParentDocIds) {
    const collectionName = job.collectionName;
    const { prefix, base: baseColl } = getPrefixAndBase(collectionName);

    const parentRefs = PARENT_REF_MAP[baseColl];
    if (!parentRefs || parentRefs.length === 0) {
      return true; // Root entity (Tier 0)
    }

    const payload = job.payload;
    if (!payload || typeof payload !== 'object') {
      return true;
    }

    for (const ref of parentRefs) {
      const parentId = payload[ref.field];
      if (!parentId) continue;
      const parentIdStr = parentId.toString();

      // 1. Same-batch check: did this parent fail earlier in the current batch?
      if (failedParentDocIds.has(parentIdStr)) {
        return false;
      }

      const parentColl = `${prefix}${ref.collection}`;

      // 2. Cross-batch check: is there a pending/processing/failed/conflict job for this parent in SyncQueue?
      const pendingParentJob = await SyncQueue.findOne({
        collectionName: parentColl,
        documentId: parentId,
        _id: { $ne: job._id },
        status: { $in: ['pending', 'processing', 'in_progress', 'failed', 'conflict'] }
      }).select('_id status').lean();

      if (pendingParentJob) {
        return false; // Parent job has not successfully synced
      }

      // 3. Existence check on Atlas: does the parent document actually exist in the Atlas collection?
      try {
        const parentOnAtlas = await atlasConn.collection(parentColl).findOne(
          { _id: parentId },
          { projection: { _id: 1 } }
        );
        if (!parentOnAtlas) {
          return false; // Parent document is missing from Atlas
        }
      } catch (_) {
        return false;
      }
    }

    return true;
  }

  /**
   * Uploads a single mutation job to MongoDB Atlas using the native MongoDB Collection API
   */
  async uploadJobToAtlas(job, atlasConn) {
    const { collectionName, documentId, operation, payload, version } = job;

    // Safety Isolation Enforcement:
    if (this.options.enforceTestIsolation) {
      const dbName = atlasConn.name || (atlasConn.db ? atlasConn.db.databaseName : '');
      const isTestDb = dbName.includes('test') || dbName.includes('isolated');
      const isTestColl = collectionName.startsWith('test_');
      if (!isTestDb || !isTestColl) {
        throw new Error(
          `⛔ SAFETY ABORT: Refusing to execute Atlas write on non-test target: db=${dbName}, coll=${collectionName}`
        );
      }
    }

    // Safety Exclusion Guards:
    if (
      collectionName === 'users' &&
      (payload?.email === 'faculty@festflow.edu' || documentId.toString() === '6ae70115a2ab160fb98025c5')
    ) {
      return {
        status: 'conflict',
        reason: 'Safety Hold: Faculty account faculty@festflow.edu is held offline pending manual identity verification.'
      };
    }
    if (collectionName === '_orphaned_clubmemberships_backup' || collectionName.includes('quarantined')) {
      return {
        status: 'conflict',
        reason: 'Safety Hold: Quarantined memberships are isolated from cloud sync.'
      };
    }

    const atlasColl = atlasConn.collection(collectionName);

    const localVersion = (version !== undefined && version !== null)
      ? version
      : ((payload && payload._syncVersion !== undefined && payload._syncVersion !== null) ? payload._syncVersion : 1);

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const cleanPayload = { ...payload };
      if (!cleanPayload._id) cleanPayload._id = documentId;
      if (cleanPayload._syncVersion === undefined || cleanPayload._syncVersion === null) {
        cleanPayload._syncVersion = localVersion;
      }

      // 1. Inspect existing document on Atlas
      let cloudDoc = await atlasColl.findOne({ _id: documentId });

      // CASE A: Document does NOT exist on Atlas -> insertOne with duplicate race recovery
      if (!cloudDoc) {
        try {
          const insertRes = await atlasColl.insertOne(cleanPayload);
          if (!insertRes.acknowledged) {
            throw new Error(`Atlas insert operation unacknowledged for ${collectionName}:${documentId}`);
          }
          return { status: 'synced' };
        } catch (insertErr) {
          if (insertErr.code === 11000) {
            // Concurrent insert race condition: re-read cloud document and evaluate below
            cloudDoc = await atlasColl.findOne({ _id: documentId });
            if (!cloudDoc) throw insertErr;
          } else {
            throw insertErr;
          }
        }
      }

      // CASE B: Document exists on Atlas -> Evaluate versions with ICAS
      if (cloudDoc) {
        const cloudVersion = (cloudDoc._syncVersion !== undefined && cloudDoc._syncVersion !== null)
          ? cloudDoc._syncVersion
          : 1;

        if (cloudVersion > localVersion) {
          const reason = `Cloud version (${cloudVersion}) is strictly newer than local mutation version (${localVersion})`;
          await syncQueueService.recordConflict({
            collectionName,
            documentId,
            localVersion,
            cloudVersion,
            localPayload: payload,
            cloudPayload: cloudDoc,
            conflictReason: reason
          });
          return { status: 'conflict', cloudVersion, reason };
        }

        if (cloudVersion === localVersion) {
          const identical = this.isContentEqual(cleanPayload, cloudDoc);
          if (identical) {
            // Already identical version on Atlas (idempotent no-op)
            return { status: 'synced', alreadySynced: true };
          } else {
            const reason = `Document exists on Atlas with equal version (v${localVersion}) but divergent business content`;
            await syncQueueService.recordConflict({
              collectionName,
              documentId,
              localVersion,
              cloudVersion,
              localPayload: payload,
              cloudPayload: cloudDoc,
              conflictReason: reason
            });
            return { status: 'conflict', cloudVersion, reason };
          }
        }

        // Local is strictly newer -> Atomic CAS update
        const updateRes = await atlasColl.replaceOne(
          { _id: documentId, _syncVersion: cloudVersion },
          cleanPayload
        );

        if (updateRes.matchedCount === 0) {
          const reason = `Concurrent write modified Atlas document (expected v${cloudVersion}) during CAS execution`;
          await syncQueueService.recordConflict({
            collectionName,
            documentId,
            localVersion,
            cloudVersion,
            localPayload: payload,
            cloudPayload: await atlasColl.findOne({ _id: documentId }),
            conflictReason: reason
          });
          return { status: 'conflict', cloudVersion, reason };
        }

        return { status: 'synced' };
      }
    } else if (operation === 'DELETE') {
      // 1. Inspect existing document on Atlas
      const cloudDoc = await atlasColl.findOne({ _id: documentId });

      if (!cloudDoc) {
        // Document already absent on Atlas (Rule 1: Absent from Cloud invariance)
        return { status: 'synced', alreadySynced: true };
      }

      const cloudVersion = (cloudDoc._syncVersion !== undefined && cloudDoc._syncVersion !== null)
        ? cloudDoc._syncVersion
        : 1;

      if (cloudVersion > localVersion) {
        const reason = `Cloud document was modified or recreated (v${cloudVersion}) after local deletion (v${localVersion})`;
        await syncQueueService.recordConflict({
          collectionName,
          documentId,
          localVersion,
          cloudVersion,
          localPayload: payload,
          cloudPayload: cloudDoc,
          conflictReason: reason
        });
        return { status: 'conflict', cloudVersion, reason };
      }

      // 2. Perform atomic deletion on Atlas conditional on cloudVersion
      const result = await atlasColl.deleteOne({ _id: documentId, _syncVersion: cloudVersion });
      if (!result.acknowledged) {
        throw new Error(`Atlas delete operation unacknowledged for ${collectionName}:${documentId}`);
      }

      return { status: 'synced' };
    } else {
      throw new Error(`Unsupported sync operation type: ${operation}`);
    }
  }

  /**
   * Returns worker health and observability statistics
   */
  async getWorkerStatus() {
    const config = this.getConfig();
    let queueStats = { pending: 0, processing: 0, failed: 0, synced: 0 };

    try {
      queueStats = await syncQueueService.getQueueStats();
    } catch (_) {}

    return {
      enabled: config.enabled,
      running: this.isRunning,
      isOfflineMode: config.isOffline,
      atlasConnected: this.isAtlasReady(),
      pendingCount: queueStats.pending,
      processingCount: queueStats.processing || queueStats.inProgress || 0,
      failedCount: queueStats.failed,
      syncedCount: queueStats.synced,
      totalSyncedByWorker: this.totalSyncedCount,
      totalFailedByWorker: this.totalFailedCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
      lastActivity: this.lastActivity,
      config: {
        syncIntervalMs: config.syncIntervalMs,
        batchSize: config.batchSize,
        maxRetries: config.maxRetries
      }
    };
  }
}

// Singleton worker instance for default application lifecycle
const syncWorkerInstance = new SyncWorkerService();

module.exports = syncWorkerInstance;
module.exports.SyncWorkerService = SyncWorkerService;
module.exports.DEPENDENCY_TIERS = DEPENDENCY_TIERS;
module.exports.getDependencyTier = getDependencyTier;
module.exports.PARENT_REF_MAP = PARENT_REF_MAP;
