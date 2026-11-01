const mongoose = require('mongoose');
const SyncQueue = require('../models/SyncQueue');
const SyncTombstone = require('../models/SyncTombstone');
const syncQueueService = require('./syncQueueService');

const EXCLUDED_MODELS = new Set([
  'SyncQueue',
  'SyncTombstone',
  'SyncConflict'
]);

/**
 * Reconciles local database collections and tombstones against the persistent SyncQueue.
 * Safely recovers any mutations that occurred before a server crash without creating duplicates.
 */
const reconcileAll = async () => {
  const summary = {
    collectionsChecked: 0,
    documentsScanned: 0,
    mutationsEnqueued: 0,
    tombstonesScanned: 0,
    tombstonesEnqueued: 0,
    abortedTombstonesCleaned: 0,
    errors: []
  };

  const modelNames = Object.keys(mongoose.models).filter((name) => !EXCLUDED_MODELS.has(name));

  // 1. Reconcile Active Documents across all collections
  for (const modelName of modelNames) {
    try {
      const model = mongoose.models[modelName];
      const collectionName = model.collection.name;
      summary.collectionsChecked++;

      // Scan documents in batches
      const cursor = model.find({}).lean().cursor();

      for await (const doc of cursor) {
        summary.documentsScanned++;
        const docVersion = doc._syncVersion || 1;

        // Find the latest queue entry for this document
        const latestJob = await SyncQueue.findOne({
          collectionName,
          documentId: doc._id
        }).sort({ version: -1 });

        // If no queue entry exists, or document has an unqueued higher version
        if (!latestJob || docVersion > latestJob.version) {
          const operation = !latestJob ? 'CREATE' : 'UPDATE';
          await syncQueueService.enqueueMutation({
            collectionName,
            documentId: doc._id,
            operation,
            payload: doc,
            version: docVersion
          });
          summary.mutationsEnqueued++;
        }
      }
    } catch (err) {
      summary.errors.push({ model: modelName, error: err.message });
      console.warn(`[SyncReconciler] Error scanning model ${modelName}:`, err.message);
    }
  }

  // 2. Reconcile Deletion Tombstones with Active Document Verification
  try {
    const tombstones = await SyncTombstone.find({}).lean();
    for (const tomb of tombstones) {
      summary.tombstonesScanned++;

      // Check if the document still exists in the active collection (aborted deletion check)
      const targetModel =
        mongoose.models[tomb.collectionName] ||
        Object.values(mongoose.models).find((m) => m.collection && m.collection.name === tomb.collectionName);

      let docStillExists = false;
      if (targetModel) {
        const activeDoc = await targetModel.findById(tomb.documentId).select('_id').lean();
        if (activeDoc) docStillExists = true;
      }

      if (docStillExists) {
        // Document was NOT deleted (process crashed after pre-hook before actual DB delete)
        // Clean up premature tombstone so active document remains valid
        await SyncTombstone.deleteOne({ _id: tomb._id });
        summary.abortedTombstonesCleaned++;
        continue;
      }

      // Document was indeed deleted! Check if DELETE job exists in SyncQueue
      const deleteJob = await SyncQueue.findOne({
        collectionName: tomb.collectionName,
        documentId: tomb.documentId,
        operation: 'DELETE'
      });

      if (!deleteJob) {
        await syncQueueService.enqueueMutation({
          collectionName: tomb.collectionName,
          documentId: tomb.documentId,
          operation: 'DELETE',
          payload: { _id: tomb.documentId, deletedAt: tomb.deletedAt },
          version: tomb.version || 1,
          metadata: tomb.metadata
        });
        summary.tombstonesEnqueued++;
      }
    }
  } catch (err) {
    summary.errors.push({ source: 'SyncTombstone', error: err.message });
    console.warn('[SyncReconciler] Error reconciling tombstones:', err.message);
  }

  return summary;
};

module.exports = {
  reconcileAll
};
