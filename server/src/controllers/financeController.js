const { Budget, Expense, Revenue } = require('../models/Finance');
const Event = require('../models/Event');
const { isAuthorizedForClub, getAuthorizedClubIds } = require('../utils/clubAuthorization');

// @desc    Get events whose finances the user is authorized to manage
// @route   GET /api/finances/events
// @access  Private (Admin, Organizer)
const getAuthorizedFinanceEvents = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      const authorizedClubIds = await getAuthorizedClubIds(req.user);
      query.club = { $in: authorizedClubIds };
    }

    const events = await Event.find(query)
      .populate('club', 'name category')
      .populate('venue', 'name location capacity')
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete financial summary for an event (Calculates Total_Revenue, Total_Expenditure & Profit dynamically)
// @route   GET /api/finances/event/:eventId
// @access  Private (Admin, Organizer of the owning club)
const getEventFinancials = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view financial records for this club.'
      });
    }

    const [budget, expenses, revenues] = await Promise.all([
      Budget.findOne({ event: eventId }),
      Expense.find({ event: eventId }).sort({ expenseDate: -1 }),
      Revenue.find({ event: eventId }).sort({ revenueDate: -1 })
    ]);

    // Derived on the fly without storing redundant totals in DB
    const totalExpenditure = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalRevenue = revenues.reduce((sum, item) => sum + (item.amount || 0), 0);
    const profit = totalRevenue - totalExpenditure;

    res.status(200).json({
      success: true,
      summary: {
        budget: budget || null,
        totalRevenue,
        totalExpenditure,
        profit,
        isProfitable: profit >= 0
      },
      expenses,
      revenues
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update event budget
// @route   POST /api/finances/budget
// @access  Private (Admin, Organizer of the owning club)
const setEventBudget = async (req, res, next) => {
  try {
    const { eventId, allocatedAmount, approvedAmount, budgetStatus } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to configure budgets for this club.'
      });
    }

    const budget = await Budget.findOneAndUpdate(
      { event: eventId },
      {
        allocatedAmount: Number(allocatedAmount),
        approvedAmount: approvedAmount ? Number(approvedAmount) : 0,
        budgetStatus: budgetStatus || 'pending',
        approvalDate: budgetStatus === 'approved' ? new Date() : null
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Event budget saved successfully',
      budget
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add an expense record
// @route   POST /api/finances/expense
// @access  Private (Admin, Organizer of the owning club)
const addExpense = async (req, res, next) => {
  try {
    const { eventId, amount, expenseCategory, description } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to record expenses for this club.'
      });
    }

    const expense = await Expense.create({
      event: eventId,
      amount: Number(amount),
      expenseCategory: expenseCategory || 'miscellaneous',
      description
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a revenue record
// @route   POST /api/finances/revenue
// @access  Private (Admin, Organizer of the owning club)
const addRevenue = async (req, res, next) => {
  try {
    const { eventId, revenueType, amount, description } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to record revenues for this club.'
      });
    }

    const revenue = await Revenue.create({
      event: eventId,
      revenueType: revenueType || 'other',
      amount: Number(amount),
      description
    });

    res.status(201).json({
      success: true,
      message: 'Revenue recorded successfully',
      revenue
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthorizedFinanceEvents,
  getEventFinancials,
  setEventBudget,
  addExpense,
  addRevenue
};
