const mongoose = require('mongoose');

const syncTombstoneSchema = new mongoose.Schema(
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
    version: {
      type: Number,
      required: true,
      default: 1
    },
    deletedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

syncTombstoneSchema.index({ collectionName: 1, documentId: 1 }, { unique: true });

module.exports = mongoose.model('SyncTombstone', syncTombstoneSchema);
