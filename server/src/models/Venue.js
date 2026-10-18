const mongoose = require('mongoose');

const venueFacilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'maintenance', 'unavailable'],
      default: 'available'
    }
  },
  { _id: true }
);

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a venue name'],
      unique: true,
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Please provide venue location/block details'],
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide venue capacity'],
      min: [1, 'Capacity must be at least 1']
    },
    venueType: {
      type: String,
      enum: ['Auditorium', 'Seminar Hall', 'Open Ground', 'Lab', 'Classroom', 'Conference Room', 'Indoor Stadium'],
      default: 'Auditorium'
    },
    facilities: [venueFacilitySchema],
    status: {
      type: String,
      enum: ['available', 'maintenance', 'booked'],
      default: 'available'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Venue', venueSchema);
