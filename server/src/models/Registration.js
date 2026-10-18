const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Registration must be linked to a user']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Registration must be linked to an event']
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    registrationType: {
      type: String,
      enum: ['solo', 'team'],
      default: 'solo'
    },
    registrationStatus: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    },
    ticketNumber: {
      type: String,
      unique: true,
      required: true
    },
    qrCode: {
      type: String,
      default: ''
    },
    fee: {
      type: Number,
      default: 0
    },
    cancellationDate: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate registrations for the same user and event
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
