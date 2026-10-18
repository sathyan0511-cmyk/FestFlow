const mongoose = require('mongoose');

const cateringMenuItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const cateringSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    catererName: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    menu: [cateringMenuItemSchema],
    serviceDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for derived total cost (3NF compliant: Quantity * Cost_Per_Unit)
cateringSchema.virtual('totalCost').get(function () {
  if (!this.menu || !this.menu.length) return 0;
  return this.menu.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
});

module.exports = mongoose.model('Catering', cateringSchema);
