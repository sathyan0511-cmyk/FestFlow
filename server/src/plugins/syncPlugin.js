const syncQueueService = require('../services/syncQueueService');
const SyncTombstone = require('../models/SyncTombstone');

const EXCLUDED_COLLECTIONS = new Set([
  'sync_queues',
  'sync_tombstones',
  'sync_conflicts',
  'syncqueues',
  'synctombstones',
  'syncconflicts'
]);

const isExcluded = (name) => {
  if (!name) return false;
  return EXCLUDED_COLLECTIONS.has(name.toLowerCase());
};

/**
 * Persists a Write-Ahead Tombstone (WAT) BEFORE a document is deleted from disk.
 * If tombstone persistence fails, it re-throws to abort the physical deletion.
 * This guarantees deletion survival across abrupt process crashes and prevents untracked data loss.
 */
const persistWriteAheadTombstone = async (collectionName, documentId, version, metadata = {}) => {
  try {
    await SyncTombstone.findOneAndUpdate(
      { collectionName, documentId },
      {
        $set: {
          collectionName,
          documentId,
          version: (version || 1) + 1,
          deletedAt: new Date(),
          metadata
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error(`[SyncPlugin] FATAL: Write-ahead tombstone persistence failed for ${collectionName}:${documentId}:`, err.message);
    throw new Error(`Write-Ahead Tombstone failed for ${collectionName}:${documentId}: ${err.message}. Aborting deletion.`);
  }
};

/**
 * Universal Mongoose Schema Plugin for Offline Mutation Capture & Versioning
 */
const syncPlugin = (schema, options) => {
  // Add monotonically increasing version field
  schema.add({
    _syncVersion: {
      type: Number,
      default: 1,
      index: true
    }
  });

  // 1. Hook: Document save() and Model.create()
  schema.pre('save', function (next) {
    if (this.isNew) {
      if (!this._syncVersion) this._syncVersion = 1;
      this.$locals = this.$locals || {};
      this.$locals.isNewDoc = true;
    } else {
      this._syncVersion = (this._syncVersion || 1) + 1;
      this.$locals = this.$locals || {};
      this.$locals.isNewDoc = false;
    }
    next();
  });

  schema.post('save', async function (doc) {
    if (!doc || !doc.constructor || !doc.constructor.collection) return;
    const collectionName = doc.constructor.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const isNew = doc.$locals && doc.$locals.isNewDoc;
      const operation = isNew ? 'CREATE' : 'UPDATE';
      const version = doc._syncVersion || 1;
      const payload = doc.toObject ? doc.toObject({ virtuals: false, depopulate: true }) : doc;

      await syncQueueService.enqueueMutation({
        collectionName,
        documentId: doc._id,
        operation,
        payload,
        version
      });
    } catch (err) {
      console.warn(`[SyncPlugin] Save hook error for ${collectionName}:${doc._id}:`, err.message);
    }
  });

  // 2. Hook: Document deleteOne() with Write-Ahead Tombstone
  schema.pre('deleteOne', { document: true, query: false }, async function () {
    if (!this.constructor || !this.constructor.collection) return;
    const collectionName = this.constructor.collection.name;
    if (isExcluded(collectionName)) return;

    // Await Write-Ahead Tombstone. If persistence fails, this throws and aborts deletion.
    await persistWriteAheadTombstone(collectionName, this._id, this._syncVersion || 1);
  });

  schema.post('deleteOne', { document: true, query: false }, async function (doc) {
    if (!doc || !doc.constructor || !doc.constructor.collection) return;
    const collectionName = doc.constructor.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const version = (doc._syncVersion || 1) + 1;
      await syncQueueService.enqueueMutation({
        collectionName,
        documentId: doc._id,
        operation: 'DELETE',
        payload: { _id: doc._id, deletedAt: new Date() },
        version
      });
    } catch (err) {
      console.warn(`[SyncPlugin] deleteOne hook error for ${collectionName}:${doc._id}:`, err.message);
    }
  });

  // 3. Hook: Query findOneAndUpdate() & findByIdAndUpdate()
  schema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate() || {};
    if (update.$inc && update.$inc._syncVersion) {
      // already incrementing
    } else if (update.$set && update.$set._syncVersion) {
      // explicitly setting
    } else {
      update.$inc = update.$inc || {};
      update.$inc._syncVersion = 1;
      this.setUpdate(update);
    }
    // Ensure the post hook receives the exact atomic post-update document snapshot
    this.setOptions({ new: true });
  });

  schema.post('findOneAndUpdate', async function (doc) {
    if (!doc || !this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const payload = doc.toObject ? doc.toObject({ virtuals: false, depopulate: true }) : doc;

      await syncQueueService.enqueueMutation({
        collectionName,
        documentId: doc._id,
        operation: 'UPDATE',
        payload,
        version: doc._syncVersion || 1
      });
    } catch (err) {
      console.warn(`[SyncPlugin] findOneAndUpdate hook error for ${collectionName}:${doc._id}:`, err.message);
    }
  });

  // 4. Hook: Query findOneAndDelete() with Write-Ahead Tombstone
  schema.pre('findOneAndDelete', async function () {
    if (!this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    const targetDoc = await this.model.findOne(this.getQuery()).select('_id _syncVersion').lean();
    if (targetDoc) {
      this._docToDelete = targetDoc;
      // If tombstone fails, this throws and aborts deletion.
      await persistWriteAheadTombstone(collectionName, targetDoc._id, targetDoc._syncVersion || 1);
    }
  });

  schema.post('findOneAndDelete', async function (doc) {
    const targetDoc = doc || this._docToDelete;
    if (!targetDoc || !this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const version = (targetDoc._syncVersion || 1) + 1;
      await syncQueueService.enqueueMutation({
        collectionName,
        documentId: targetDoc._id,
        operation: 'DELETE',
        payload: { _id: targetDoc._id, deletedAt: new Date() },
        version
      });
    } catch (err) {
      console.warn(`[SyncPlugin] findOneAndDelete hook error for ${collectionName}:${targetDoc._id}:`, err.message);
    }
  });

  // 5. Hook: Query deleteMany() with Batch Write-Ahead Tombstones
  schema.pre('deleteMany', async function () {
    if (!this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    const filter = this.getQuery();
    const matchingDocs = await this.model.find(filter).select('_id _syncVersion').lean();
    this._docsToDelete = matchingDocs;

    // Write-Ahead Tombstones for ALL matching documents BEFORE delete execution
    // If ANY tombstone persistence fails, this throws and aborts deleteMany(),
    // ensuring partial tombstone creation cannot silently result in untracked deletions.
    for (const d of matchingDocs) {
      await persistWriteAheadTombstone(collectionName, d._id, d._syncVersion || 1);
    }
  });

  schema.post('deleteMany', async function () {
    if (!this.model || !this._docsToDelete) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      for (const d of this._docsToDelete) {
        const version = (d._syncVersion || 1) + 1;
        await syncQueueService.enqueueMutation({
          collectionName,
          documentId: d._id,
          operation: 'DELETE',
          payload: { _id: d._id, deletedAt: new Date() },
          version
        });
      }
    } catch (err) {
      console.warn(`[SyncPlugin] deleteMany hook error for ${collectionName}:`, err.message);
    }
  });

  // 6. Hook: Query updateOne() & updateMany()
  schema.pre('updateOne', function () {
    const update = this.getUpdate() || {};
    if (!update.$inc || !update.$inc._syncVersion) {
      update.$inc = update.$inc || {};
      update.$inc._syncVersion = 1;
      this.setUpdate(update);
    }
  });

  schema.post('updateOne', async function () {
    if (!this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const filter = this.getQuery();
      const doc = await this.model.findOne(filter).lean();
      if (doc) {
        await syncQueueService.enqueueMutation({
          collectionName,
          documentId: doc._id,
          operation: 'UPDATE',
          payload: doc,
          version: doc._syncVersion || 1
        });
      }
    } catch (err) {
      console.warn(`[SyncPlugin] updateOne hook error for ${collectionName}:`, err.message);
    }
  });

  // 7. Hook: Query updateMany()
  schema.pre('updateMany', function () {
    const update = this.getUpdate() || {};
    if (!update.$inc || !update.$inc._syncVersion) {
      update.$inc = update.$inc || {};
      update.$inc._syncVersion = 1;
      this.setUpdate(update);
    }
  });

  schema.post('updateMany', async function () {
    if (!this.model) return;
    const collectionName = this.model.collection.name;
    if (isExcluded(collectionName)) return;

    try {
      const filter = this.getQuery();
      const docs = await this.model.find(filter).lean();
      for (const doc of docs) {
        await syncQueueService.enqueueMutation({
          collectionName,
          documentId: doc._id,
          operation: 'UPDATE',
          payload: doc,
          version: doc._syncVersion || 1
        });
      }
    } catch (err) {
      console.warn(`[SyncPlugin] updateMany hook error for ${collectionName}:`, err.message);
    }
  });
};

module.exports = syncPlugin;
