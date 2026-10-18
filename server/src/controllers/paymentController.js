const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { Revenue } = require('../models/Finance');

// @desc    Process or record payment for an event registration
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res, next) => {
  try {
    const { registrationId, paymentMethod = 'upi' } = req.body;

    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    }

    const event = registration.event;
    const amount = event.registrationFee || 0;

    // Check if already paid
    const existing = await Payment.findOne({
      registration: registration._id,
      paymentStatus: 'completed'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this registration',
        payment: existing
      });
    }

    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
      registration: registration._id,
      event: event._id,
      user: req.user.id,
      amount,
      paymentMethod,
      transactionId,
      paymentStatus: 'completed'
    });

    // Auto-record in Event Revenue for financial tracking (if fee > 0)
    if (amount > 0) {
      await Revenue.create({
        event: event._id,
        revenueType: 'registration_fees',
        amount,
        description: `Registration fee from ${req.user.name} (Txn: ${transactionId})`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's payments
// @route   GET /api/payments/my
// @access  Private
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('event', 'title startDate venue')
      .populate('registration', 'ticketNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for an event
// @route   GET /api/payments/event/:eventId
// @access  Private (Admin, Organizer)
const getEventPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ event: req.params.eventId })
      .populate('user', 'name email department registerNumber')
      .populate('registration', 'ticketNumber')
      .sort({ createdAt: -1 });

    const totalCollected = payments
      .filter((p) => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalCollected,
      payments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processPayment,
  getMyPayments,
  getEventPayments
};
