const Catering = require('../models/Catering');
const { Expense } = require('../models/Finance');
const Event = require('../models/Event');

// @desc    Get catering details and menu items for an event
// @route   GET /api/catering/event/:eventId
// @access  Public
const getCateringByEvent = async (req, res, next) => {
  try {
    const catering = await Catering.find({ event: req.params.eventId });

    const totalCateringCost = catering.reduce((sum, c) => sum + (c.totalCost || 0), 0);

    res.status(200).json({
      success: true,
      count: catering.length,
      totalCateringCost,
      catering
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update catering order with menu items
// @route   POST /api/catering
// @access  Private (Admin, Organizer)
const saveCatering = async (req, res, next) => {
  try {
    const { eventId, catererName, contactPerson, phone, email, menu, status } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const catering = await Catering.create({
      event: eventId,
      catererName,
      contactPerson,
      phone,
      email,
      menu: menu || [],
      status: status || 'confirmed'
    });

    // Auto-record into event expenses if cost > 0
    if (catering.totalCost > 0) {
      await Expense.create({
        event: eventId,
        amount: catering.totalCost,
        expenseCategory: 'catering',
        description: `Catering order from ${catererName} (${(menu || []).length} items)`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Catering order and menu registered successfully',
      catering
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCateringByEvent,
  saveCatering
};
