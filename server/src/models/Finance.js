const mongoose = require('mongoose');

// EVENT_BUDGET
const budgetSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    approvedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    budgetStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft'
    },
    approvalDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// EXPENSE
const expenseSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    expenseCategory: {
      type: String,
      enum: ['equipment', 'catering', 'marketing', 'prizes', 'logistics', 'travel', 'miscellaneous'],
      default: 'equipment'
    },
    expenseDate: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

// EVENT_REVENUE
const revenueSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    revenueType: {
      type: String,
      enum: ['sponsorship', 'registration_fees', 'merchandise', 'grant', 'ticket_sales', 'other'],
      default: 'registration_fees'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    revenueDate: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

const Budget = mongoose.model('Budget', budgetSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = {
  Budget,
  Expense,
  Revenue
};
