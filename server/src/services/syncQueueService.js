const SyncQueue = require('../models/SyncQueue');
const SyncTombstone = require('../models/SyncTombstone');
const SyncConflict = require('../models/SyncConflict');

/**
 * Generates a deterministic idempotency key for a mutation
 */
const generateIdempotencyKey = (collectionName, documentId, version, operation) => {
  return `${collectionName}:${documentId.toString()}:v${version}:${operation}`;
};

/**
 * Sanitizes payloads before storage to ensure sensitive data rules
 */
const sanitizePayload = (collectionName, payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = Array.isArray(payload) ? [...payload] : { ...payload };

  if (collectionName === 'users') {
    delete clean.plainPassword;
    delete clean.resetPasswordToken;
    delete clean.resetPasswordExpire;
    delete clean.token;
    // Security Guard: Plaintext passwords must NEVER enter sync payloads
    if (clean.password && typeof clean.password === 'string' && !clean.password.startsWith('$2')) {
      delete clean.password;
    }
  }

  return clean;
};

/**
 * Persistently enqueues a database mutation into SyncQueue and records tombstones on delete
 */
const enqueueMutation = async ({
  collectionName,
  documentId,
  operation,
  payload,
  version = 1,
  metadata = {}
}) => {
  if (!collectionName || !documentId || !operation) {
    throw new Error('collectionName, documentId, and operation are required for enqueueMutation');
  }

  const idempotencyKey = generateIdempotencyKey(collectionName, documentId, version, operation);
  const cleanPayload = sanitizePayload(collectionName, payload);

  // If operation is DELETE, record persistent tombstone
  if (operation === 'DELETE') {
    try {
      await SyncTombstone.findOneAndUpdate(
        { collectionName, documentId },
        {
          $set: {
            collectionName,
            documentId,
            version,
            deletedAt: new Date(),
            metadata
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn(`[SyncTombstone] Warning recording tombstone for ${collectionName}:${documentId}:`, err.message);
    }
  }

  // Idempotent upsert into SyncQueue
  const job = await SyncQueue.findOneAndUpdate(
    { idempotencyKey },
    {
      $set: {
        collectionName,
        documentId,
        operation,
        payload: cleanPayload,
        version,
        idempotencyKey,
        status: 'pending',
        errorDetails: null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return job;
};

/**
 * Records a conflict for administrative review
 */
const recordConflict = async ({
  collectionName,
  documentId,
  localVersion,
  cloudVersion,
  localPayload,
  cloudPayload,
  conflictReason
}) => {
  const conflict = await SyncConflict.create({
    collectionName,
    documentId,
    localVersion,
    cloudVersion,
    localPayload: sanitizePayload(collectionName, localPayload),
    cloudPayload: sanitizePayload(collectionName, cloudPayload),
    conflictReason,
    status: 'unresolved'
  });

  // Mark pending or in-flight processing jobs for this document as in conflict
  await SyncQueue.updateMany(
    { collectionName, documentId, status: { $in: ['pending', 'processing', 'in_progress'] } },
    { $set: { status: 'conflict', errorDetails: `Conflict: ${conflictReason}`, processingStartedAt: null } }
  );

  return conflict;
};

/**
 * Retrieves pending mutation jobs in deterministic order
 */
const getPendingJobs = async ({ limit = 50, collectionName = null } = {}) => {
  const query = { status: 'pending' };
  if (collectionName) query.collectionName = collectionName;

  return await SyncQueue.find(query)
    .sort({ createdAt: 1, version: 1 })
    .limit(limit);
};

/**
 * Updates job execution status
 */
const updateJobStatus = async (jobId, status, errorDetails = null) => {
  const update = {
    $set: { status }
  };

  if (status === 'synced') {
    update.$set.syncedAt = new Date();
    update.$set.errorDetails = null;
    update.$set.processingStartedAt = null;
  } else if (status === 'processing' || status === 'in_progress') {
    update.$set.processingStartedAt = new Date();
  } else if (status === 'pending') {
    update.$set.processingStartedAt = null;
    if (errorDetails !== null) {
      update.$set.errorDetails = errorDetails;
      update.$inc = { retryCount: 1 };
    }
  } else if (status === 'failed' || status === 'conflict') {
    update.$set.errorDetails = errorDetails;
    update.$set.processingStartedAt = null;
    update.$inc = { retryCount: 1 };
  }

  return await SyncQueue.findByIdAndUpdate(jobId, update, { new: true });
};

/**
 * Atomically claims a pending job for processing to prevent duplicate processing
 */
const claimPendingJob = async (jobId) => {
  return await SyncQueue.findOneAndUpdate(
    { _id: jobId, status: 'pending' },
    {
      $set: {
        status: 'processing',
        processingStartedAt: new Date()
      }
    },
    { new: true }
  );
};

/**
 * Recovers stale or crashed processing jobs back to pending status
 */
const recoverStaleProcessingJobs = async (lockTimeoutMs = 300000) => {
  const cutoff = new Date(Date.now() - lockTimeoutMs);
  const result = await SyncQueue.updateMany(
    {
      status: { $in: ['processing', 'in_progress'] },
      $or: [
        { processingStartedAt: { $lt: cutoff } },
        { processingStartedAt: null },
        { processingStartedAt: { $exists: false } }
      ]
    },
    {
      $set: {
        status: 'pending',
        processingStartedAt: null
      },
      $inc: { retryCount: 1 }
    }
  );

  return result.modifiedCount || 0;
};

/**
 * Returns summary statistics of queue depth and sync health
 */
const getQueueStats = async () => {
  const [pending, processing, synced, failed, conflict, tombstones, unresolvedConflicts] = await Promise.all([
    SyncQueue.countDocuments({ status: 'pending' }),
    SyncQueue.countDocuments({ status: { $in: ['processing', 'in_progress'] } }),
    SyncQueue.countDocuments({ status: 'synced' }),
    SyncQueue.countDocuments({ status: 'failed' }),
    SyncQueue.countDocuments({ status: 'conflict' }),
    SyncTombstone.countDocuments(),
    SyncConflict.countDocuments({ status: 'unresolved' })
  ]);

  return {
    pending,
    processing,
    inProgress: processing, // backwards compatibility
    synced,
    failed,
    conflict,
    total: pending + processing + synced + failed + conflict,
    tombstones,
    unresolvedConflicts
  };
};

module.exports = {
  generateIdempotencyKey,
  sanitizePayload,
  enqueueMutation,
  recordConflict,
  getPendingJobs,
  claimPendingJob,
  recoverStaleProcessingJobs,
  updateJobStatus,
  getQueueStats
};
