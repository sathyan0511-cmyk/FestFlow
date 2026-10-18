const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateNo: {
      type: String,
      unique: true,
      required: true
    },
    certificateType: {
      type: String,
      enum: ['participation', 'merit', 'winner', 'volunteer', 'organizer'],
      default: 'participation'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    verificationCode: {
      type: String,
      unique: true,
      required: true
    },
    status: {
      type: String,
      enum: ['issued', 'revoked'],
      default: 'issued'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
