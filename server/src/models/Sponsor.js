const mongoose = require('mongoose');

// SPONSOR
const sponsorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    organizationType: {
      type: String,
      enum: ['corporate', 'startup', 'tech', 'ngo', 'education', 'media', 'other'],
      default: 'corporate'
    },
    address: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// EVENT_SPONSOR
const eventSponsorSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    sponsor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor',
      required: true
    },
    sponsorshipType: {
      type: String,
      enum: ['Title', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Associate'],
      default: 'Gold'
    },
    sponsorshipAmount: {
      type: Number,
      required: true,
      min: 0
    },
    agreementDate: {
      type: Date,
      default: Date.now
    },
    sponsorshipStatus: {
      type: String,
      enum: ['proposed', 'confirmed', 'received', 'cancelled'],
      default: 'confirmed'
    }
  },
  { timestamps: true }
);

const Sponsor = mongoose.model('Sponsor', sponsorSchema);
const EventSponsor = mongoose.model('EventSponsor', eventSponsorSchema);

module.exports = {
  Sponsor,
  EventSponsor
};
