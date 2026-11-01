const mongoose = require('mongoose');

const syncConflictSchema = new mongoose.Schema(
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
    localVersion: {
      type: Number,
      required: true
    },
    cloudVersion: {
      type: Number,
      default: null
    },
    localPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    cloudPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    conflictReason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['unresolved', 'resolved', 'ignored'],
      default: 'unresolved',
      index: true
    },
    resolutionStrategy: {
      type: String,
      default: null
    },
    resolvedBy: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

syncConflictSchema.index({ status: 1, createdAt: 1 });
syncConflictSchema.index({ collectionName: 1, documentId: 1 });

module.exports = mongoose.model('SyncConflict', syncConflictSchema);
