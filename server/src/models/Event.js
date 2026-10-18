const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      trim: true
    },
    eventType: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Competition', 'Fest'],
      default: 'Technical'
    },
    category: {
      type: String,
      default: 'General',
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date']
    },
    startTime: {
      type: String,
      required: [true, 'Please provide start time (e.g. 10:00)']
    },
    endTime: {
      type: String,
      required: [true, 'Please provide end time (e.g. 16:00)']
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'published'
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'An event must belong to a club']
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'An event must have an assigned venue']
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Please specify maximum allowed participants'],
      min: [1, 'Maximum participants must be at least 1']
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Please provide a registration deadline']
    },
    registrationFee: {
      type: Number,
      default: 0,
      min: [0, 'Registration fee cannot be negative']
    },
    chiefGuest: {
      type: String,
      trim: true,
      default: ''
    },
    organizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    imageUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for registrations
eventSchema.virtual('registrations', {
  ref: 'Registration',
  localField: '_id',
  foreignField: 'event'
});

module.exports = mongoose.model('Event', eventSchema);
