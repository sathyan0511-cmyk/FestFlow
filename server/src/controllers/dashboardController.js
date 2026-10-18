const Event = require('../models/Event');
const Club = require('../models/Club');
const Venue = require('../models/Venue');
const Registration = require('../models/Registration');
const User = require('../models/User');

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
      const myManagedClubs = await Club.find({ organizers: userId }).select('_id');
      const clubIds = myManagedClubs.map((c) => c._id);

      const [myEventsCount, myClubsCount] = await Promise.all([
        Event.countDocuments({ club: { $in: clubIds } }),
        myManagedClubs.length
      ]);

      userStats = {
        myEventsCount,
        myClubsCount
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
