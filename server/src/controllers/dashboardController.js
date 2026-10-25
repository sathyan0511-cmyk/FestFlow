const mongoose = require('mongoose');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Venue = require('../models/Venue');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { getAuthorizedClubIds, getSupervisedClubIds } = require('../utils/clubAuthorization');

// @desc    Get dashboard metrics & summary
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    const now = new Date();

    const [
      totalEvents,
      upcomingEventsCount,
      totalClubs,
      totalVenues,
      totalRegistrations,
      totalStudents
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ endDate: { $gte: now }, status: { $in: ['published', 'ongoing'] } }),
      Club.countDocuments({ status: 'active' }),
      Venue.countDocuments(),
      Registration.countDocuments({ registrationStatus: { $ne: 'cancelled' } }),
      User.countDocuments({ role: 'student' })
    ]);

    // Role-specific metrics
    let userStats = {};
    if (userRole === 'student') {
      const [myTotalRegistrations, myActiveRegistrations] = await Promise.all([
        Registration.countDocuments({ user: userId }),
        Registration.countDocuments({
          user: userId,
          registrationStatus: 'registered'
        })
      ]);

      const myUpcoming = await Registration.find({
        user: userId,
        registrationStatus: 'registered'
      })
        .populate({
          path: 'event',
          populate: [
            { path: 'venue', select: 'name location' },
            { path: 'club', select: 'name' }
          ]
        })
        .sort({ 'event.startDate': 1 })
        .limit(5);

      userStats = {
        myTotalRegistrations,
        myActiveRegistrations,
        myUpcoming
      };
    } else if (userRole === 'organizer') {
      const clubIds = await getAuthorizedClubIds(req.user);

      const [myEventsCount, myClubsCount, myActiveRegistrations] = await Promise.all([
        Event.countDocuments({ club: { $in: clubIds } }),
        clubIds.length,
        Registration.countDocuments({ user: userId, registrationStatus: 'registered' })
      ]);

      userStats = {
        myEventsCount,
        myClubsCount,
        myActiveRegistrations
      };
    } else if (userRole === 'faculty') {
      const clubIds = await getSupervisedClubIds(req.user);
      const [myEventsCount, myClubsCount, myOrganizersCount] = await Promise.all([
        Event.countDocuments({ club: { $in: clubIds } }),
        clubIds.length,
        Club.aggregate([
          { $match: { _id: { $in: clubIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
          { $unwind: '$organizers' },
          { $group: { _id: '$organizers' } },
          { $count: 'count' }
        ]).then((res) => (res[0] ? res[0].count : 0))
      ]);

      userStats = {
        myEventsCount,
        myClubsCount,
        myOrganizersCount
      };
    }

    // Recent 5 events
    const recentEvents = await Event.find({ status: { $ne: 'draft' } })
      .populate('club', 'name')
      .populate('venue', 'name')
      .sort({ startDate: -1 })
      .limit(5);

    // Recent 5 registrations
    const recentRegistrations = await Registration.find()
      .populate('user', 'name email department')
      .populate('event', 'title startDate')
      .sort({ createdAt: -1 })
      .limit(5);

    // Events by type breakdown
    const eventTypeBreakdown = await Event.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEventsCount,
        totalClubs,
        totalVenues,
        totalRegistrations,
        totalStudents,
        eventTypeBreakdown,
        recentEvents,
        recentRegistrations,
        userStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
