const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a club name'],
      unique: true,
      trim: true,
      maxlength: [100, 'Club name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide a club description'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Literary', 'Social', 'Arts', 'Academic'],
      default: 'Technical'
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    establishmentDate: {
      type: Date,
      default: Date.now
    },
    organizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    facultyCoordinator: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      department: { type: String, trim: true }
    },
    logoUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Club', clubSchema);
