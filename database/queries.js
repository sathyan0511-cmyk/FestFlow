/**
 * FestFlow Database Queries & Aggregation Pipelines (MongoDB / Mongoose)
 *
 * This file contains practical, production-grade aggregation pipelines and queries
 * implemented in the FestFlow backend API.
 *
 * Strict Normalization Rule: Derived values such as Net Profit, Available Seats,
 * Leaderboard Scores, and Catering Costs are calculated dynamically on the fly
 * rather than stored redundantly in documents.
 */

const mongoose = require('mongoose');

// =========================================================================
// 1. Dynamic Net Profit Aggregation Pipeline (3NF Strict Compliance)
// Calculates Total Revenue, Total Expenses, and Net Derived Profit for an Event
// =========================================================================
const calculateEventFinances = async (eventId) => {
  const targetId = new mongoose.Types.ObjectId(eventId);

  const [revenueAgg, expenseAgg] = await Promise.all([
    mongoose.model('Revenue').aggregate([
      { $match: { event: targetId } },
      { $group: { _id: '$event', totalRevenue: { $sum: '$amount' } } }
    ]),
    mongoose.model('Expense').aggregate([
      { $match: { event: targetId } },
      { $group: { _id: '$event', totalExpense: { $sum: '$amount' } } }
    ])
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const totalExpense = expenseAgg[0]?.totalExpense || 0;
  const netProfit = totalRevenue - totalExpense;

  return {
    eventId,
    totalRevenue,
    totalExpense,
    netProfit,
    marginPercentage: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
  };
};

// =========================================================================
// 2. Real-Time Seat Availability & Registration Headcount Pipeline
// Verifies live remaining capacity before issuing an event ticket pass
// =========================================================================
const getEventSeatAvailability = async (eventId) => {
  const targetId = new mongoose.Types.ObjectId(eventId);

  const event = await mongoose.model('Event').findById(targetId).select('maxParticipants venue title').lean();
  if (!event) throw new Error('Event not found');

  const registrationCount = await mongoose.model('Registration').countDocuments({
    event: targetId,
    registrationStatus: { $in: ['registered', 'attended'] }
  });

  const remainingSeats = Math.max(0, event.maxParticipants - registrationCount);
  const isFull = remainingSeats === 0;

  return {
    eventId: event._id,
    eventTitle: event.title,
    capacityLimit: event.maxParticipants,
    bookedSeats: registrationCount,
    remainingSeats,
    isFull
  };
};

// =========================================================================
// 3. Hackathon Leaderboard Aggregation Pipeline
// Sums and averages scores submitted by judges across all judging criteria
// =========================================================================
const getCompetitionLeaderboard = async (competitionId) => {
  const targetId = new mongoose.Types.ObjectId(competitionId);

  return await mongoose.model('JudgeScore').aggregate([
    { $match: { competition: targetId } },
    {
      $group: {
        _id: '$team',
        totalScore: { $sum: '$score' },
        evaluationsCount: { $sum: 1 },
        averageScore: { $avg: '$score' }
      }
    },
    {
      $lookup: {
        from: 'teams',
        localField: '_id',
        foreignField: '_id',
        as: 'teamDetails'
      }
    },
    { $unwind: '$teamDetails' },
    {
      $project: {
        teamId: '$_id',
        teamName: '$teamDetails.teamName',
        totalScore: { $round: ['$totalScore', 2] },
        averageScore: { $round: ['$averageScore', 2] },
        evaluationsCount: 1
      }
    },
    { $sort: { totalScore: -1 } }
  ]);
};

// =========================================================================
// 4. Catering Order Cost Computation Pipeline (1NF Unwinding)
// Computes total order cost from atomic menu subdocuments (Quantity * CostPerUnit)
// =========================================================================
const calculateCateringCost = async (eventId) => {
  const targetId = new mongoose.Types.ObjectId(eventId);

  const result = await mongoose.model('Catering').aggregate([
    { $match: { event: targetId } },
    { $unwind: '$menu' },
    {
      $group: {
        _id: '$_id',
        catererName: { $first: '$catererName' },
        totalItemsOrdered: { $sum: '$menu.quantity' },
        calculatedOrderCost: {
          $sum: { $multiply: ['$menu.quantity', '$menu.costPerUnit'] }
        }
      }
    }
  ]);

  return result;
};

// =========================================================================
// 5. Average Feedback Rating Aggregation Pipeline
// Computes the dynamic 5-star rating average across attendee reviews
// =========================================================================
const getEventAverageRating = async (eventId) => {
  const targetId = new mongoose.Types.ObjectId(eventId);

  const result = await mongoose.model('Feedback').aggregate([
    { $match: { event: targetId } },
    {
      $group: {
        _id: '$event',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return {
    eventId,
    averageRating: result[0]?.averageRating ? Number(result[0].averageRating.toFixed(2)) : 0,
    totalReviews: result[0]?.totalReviews || 0
  };
};

module.exports = {
  calculateEventFinances,
  getEventSeatAvailability,
  getCompetitionLeaderboard,
  calculateCateringCost,
  getEventAverageRating
};
