const mongoose = require('mongoose');

const clubMembershipSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    memberType: {
      type: String,
      enum: ['student', 'faculty', 'external'],
      default: 'student'
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'active'
    },
    role: {
      type: String,
      enum: ['member', 'coordinator', 'lead', 'treasurer', 'president', 'vice_president'],
      default: 'member'
    },
    joinedDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

clubMembershipSchema.index({ club: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ClubMembership', clubMembershipSchema);
