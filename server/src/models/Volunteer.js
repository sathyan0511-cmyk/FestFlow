const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
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
    assignedTask: {
      type: String,
      required: true,
      trim: true
    },
    shiftStart: {
      type: String,
      default: '09:00'
    },
    shiftEnd: {
      type: String,
      default: '17:00'
    },
    volunteerStatus: {
      type: String,
      enum: ['applied', 'assigned', 'active', 'completed', 'cancelled'],
      default: 'applied'
    }
  },
  { timestamps: true }
);

volunteerSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Volunteer', volunteerSchema);
