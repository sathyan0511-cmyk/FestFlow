const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema(
  {
    collectionName: {
      type: String,
      required: [true, 'Collection name is required'],
      index: true,
      trim: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Document ID is required'],
      index: true
    },
    operation: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE'],
      required: [true, 'Operation type is required']
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Mutation payload snapshot is required']
    },
    version: {
      type: Number,
      required: [true, 'Document version/revision is required'],
      default: 1
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'in_progress', 'synced', 'failed', 'conflict'],
      default: 'pending',
      index: true
    },
    retryCount: {
      type: Number,
      default: 0
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    processingStartedAt: {
      type: Date,
      default: null
    },
    syncedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// High-performance compound indices
syncQueueSchema.index({ status: 1, createdAt: 1 });
syncQueueSchema.index({ collectionName: 1, documentId: 1, version: 1 });

module.exports = mongoose.model('SyncQueue', syncQueueSchema);
