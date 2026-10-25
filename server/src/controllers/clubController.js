const Club = require('../models/Club');
const Event = require('../models/Event');
const User = require('../models/User');
const ClubMembership = require('../models/ClubMembership');
const {
  isAuthorizedForClub,
  getAuthorizedClubIds,
  getSupervisedClubIds,
  isFacultyForClub
} = require('../utils/clubAuthorization');

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Public
const getClubs = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const clubs = await Club.find(query)
      .populate('organizers', 'name email department phone')
      .sort({ createdAt: -1 });

    // Include event counts for each club
    const clubIds = clubs.map((c) => c._id);
    const eventCounts = await Event.aggregate([
      { $match: { club: { $in: clubIds } } },
      { $group: { _id: '$club', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    eventCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const clubsWithStats = clubs.map((c) => {
      const obj = c.toObject();
      obj.eventCount = countMap[c._id.toString()] || 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: clubsWithStats.length,
      clubs: clubsWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single club by ID with organizers, members, and events
// @route   GET /api/clubs/:id
// @access  Public
const getClubById = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('organizers', 'name email department phone registerNumber')
      .populate('facultyCoordinator.user', 'name email department phone');

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Get events for this club
    const now = new Date();
    const events = await Event.find({ club: club._id })
      .populate('venue', 'name location capacity')
      .sort({ startDate: 1 });

    const upcomingEvents = events.filter((e) => new Date(e.endDate || e.startDate) >= now);
    const pastEvents = events.filter((e) => new Date(e.endDate || e.startDate) < now);

    const membersCount = await ClubMembership.countDocuments({
      club: club._id,
      membershipStatus: 'active'
    });

    const isSupervisor = req.user ? await isFacultyForClub(req.user, club._id) : false;
    const isOrganizer = req.user ? await isAuthorizedForClub(req.user, club._id) : false;

    res.status(200).json({
      success: true,
      club,
      events,
      upcomingEvents,
      pastEvents,
      stats: {
        upcomingEventsCount: upcomingEvents.length,
        pastEventsCount: pastEvents.length,
        totalEventsCount: events.length,
        organizersCount: club.organizers ? club.organizers.length : 0,
        membersCount
      },
      permissions: {
        canManage: isSupervisor || isOrganizer || req.user?.role === 'admin',
        isSupervisor,
        isOrganizer
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new club
// @route   POST /api/clubs
// @access  Private (Admin, Organizer)
const createClub = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      contactEmail,
      contactPhone,
      establishmentDate,
      facultyCoordinator,
      organizers
    } = req.body;

    const existing = await Club.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A club with this name already exists'
      });
    }

    // Include creator in organizers if not provided
    const assignedOrganizers = organizers && organizers.length > 0
      ? organizers
      : [req.user.id];

    const club = await Club.create({
      name,
      description,
      category,
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      establishmentDate: establishmentDate || new Date(),
      facultyCoordinator,
      organizers: assignedOrganizers
    });

    res.status(201).json({
      success: true,
      message: 'Club created successfully',
      club
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a club
// @route   PUT /api/clubs/:id
// @access  Private (Admin, Organizer)
const updateClub = async (req, res, next) => {
  try {
    let club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check permission: Admin or organizer of this club
    const isOrganizer = await isAuthorizedForClub(req.user, club._id);
    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this club'
      });
    }

    club = await Club.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('organizers', 'name email department');

    res.status(200).json({
      success: true,
      message: 'Club updated successfully',
      club
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a club
// @route   DELETE /api/clubs/:id
// @access  Private (Admin only)
const deleteClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if any events are linked to this club
    const eventsCount = await Event.countDocuments({ club: club._id });
    if (eventsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete club because it has ${eventsCount} associated event(s). Please remove or reassign them first.`
      });
    }

    await club.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Club deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get clubs the current user is authorized to organize or supervise
// @route   GET /api/clubs/my-authorized
// @access  Private (Admin, Organizer, Faculty)
const getMyAuthorizedClubs = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      query = {};
    } else if (req.user.role === 'faculty') {
      const supervisedClubIds = await getSupervisedClubIds(req.user);
      query = { _id: { $in: supervisedClubIds } };
    } else if (req.user.role === 'organizer') {
      const authorizedClubIds = await getAuthorizedClubIds(req.user);
      query = { _id: { $in: authorizedClubIds } };
    } else {
      query = { _id: { $in: [] } };
    }

    const clubs = await Club.find(query)
      .populate('organizers', 'name email department phone registerNumber')
      .populate('facultyCoordinator.user', 'name email department phone')
      .sort({ name: 1 });

    const now = new Date();
    const clubIds = clubs.map((c) => c._id);

    // Compute stats dynamically
    const [upcomingEvents, allEvents, activeMembers] = await Promise.all([
      Event.aggregate([
        { $match: { club: { $in: clubIds }, endDate: { $gte: now }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$club', count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $match: { club: { $in: clubIds } } },
        { $group: { _id: '$club', count: { $sum: 1 } } }
      ]),
      ClubMembership.aggregate([
        { $match: { club: { $in: clubIds }, membershipStatus: 'active' } },
        { $group: { _id: '$club', count: { $sum: 1 } } }
      ])
    ]);

    const upcomingMap = {};
    upcomingEvents.forEach((i) => (upcomingMap[i._id.toString()] = i.count));

    const allEventsMap = {};
    allEvents.forEach((i) => (allEventsMap[i._id.toString()] = i.count));

    const membersMap = {};
    activeMembers.forEach((i) => (membersMap[i._id.toString()] = i.count));

    const enrichedClubs = clubs.map((c) => {
      const obj = c.toObject();
      obj.upcomingEventsCount = upcomingMap[c._id.toString()] || 0;
      obj.totalEventsCount = allEventsMap[c._id.toString()] || 0;
      obj.membersCount = membersMap[c._id.toString()] || 0;
      obj.organizersCount = c.organizers ? c.organizers.length : 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enrichedClubs.length,
      clubs: enrichedClubs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign an existing student as an organizer of a club
// @route   POST /api/clubs/:id/organizers
// @access  Private (Admin, Faculty supervising this club)
const assignClubOrganizer = async (req, res, next) => {
  try {
    const { id: clubId } = req.params;
    const { studentId } = req.body;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found.' });
    }

    // Check authorization: Admin or supervising faculty
    const authorized = await isFacultyForClub(req.user, clubId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not supervise this club and cannot assign organizers.'
      });
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Target student not found.' });
    }

    if (!student.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign a deactivated student.' });
    }

    // Add to Club.organizers if not already present
    const alreadyOrganizer = club.organizers.some((o) => o.toString() === student._id.toString());
    if (!alreadyOrganizer) {
      club.organizers.push(student._id);
      await club.save();
    }

    // Add to student.clubs
    if (!student.clubs) student.clubs = [];
    if (!student.clubs.some((c) => c.toString() === club._id.toString())) {
      student.clubs.push(club._id);
    }

    // Promote to organizer if student
    if (student.role === 'student') {
      student.role = 'organizer';
    }
    await student.save();

    // Ensure active ClubMembership with officer role
    await ClubMembership.findOneAndUpdate(
      { club: club._id, user: student._id },
      {
        club: club._id,
        user: student._id,
        memberType: 'student',
        membershipStatus: 'active',
        role: 'lead'
      },
      { upsert: true, new: true }
    );

    const updatedClub = await Club.findById(clubId)
      .populate('organizers', 'name email department phone registerNumber')
      .populate('facultyCoordinator.user', 'name email department');

    res.status(200).json({
      success: true,
      message: `${student.name} is now an organizer for ${club.name}.`,
      club: updatedClub
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke organizer status from a student for a specific club
// @route   DELETE /api/clubs/:id/organizers/:studentId
// @access  Private (Admin, Faculty supervising this club)
const revokeClubOrganizer = async (req, res, next) => {
  try {
    const { id: clubId, studentId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found.' });
    }

    // Check authorization: Admin or supervising faculty
    const authorized = await isFacultyForClub(req.user, clubId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not supervise this club and cannot revoke organizers.'
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    // Remove from Club.organizers
    club.organizers = club.organizers.filter((o) => o.toString() !== studentId);
    await club.save();

    // Remove from student.clubs
    if (student.clubs) {
      student.clubs = student.clubs.filter((c) => c.toString() !== clubId);
    }

    // Check remaining clubs for this student
    const remainingOrganizedClubsCount = await Club.countDocuments({
      organizers: student._id
    });

    const otherOfficerCount = await ClubMembership.countDocuments({
      user: student._id,
      club: { $ne: club._id },
      membershipStatus: 'active',
      role: { $in: ['coordinator', 'lead', 'treasurer', 'president', 'vice_president'] }
    });

    // If no remaining organizer clubs, safely revert to student
    if (remainingOrganizedClubsCount === 0 && otherOfficerCount === 0 && (!student.clubs || student.clubs.length === 0)) {
      if (student.role === 'organizer') {
        student.role = 'student';
      }
    }
    await student.save();

    // Update ClubMembership role for this club back to regular member
    await ClubMembership.findOneAndUpdate(
      { club: club._id, user: student._id },
      { role: 'member' }
    );

    const updatedClub = await Club.findById(clubId)
      .populate('organizers', 'name email department phone registerNumber')
      .populate('facultyCoordinator.user', 'name email department');

    res.status(200).json({
      success: true,
      message: `Revoked organizer status for ${student.name} in ${club.name}.`,
      club: updatedClub
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get/search eligible students for organizer assignment
// @route   GET /api/clubs/:id/eligible-students
// @access  Private (Admin, Faculty supervising this club)
const getEligibleStudents = async (req, res, next) => {
  try {
    const { id: clubId } = req.params;
    const { search } = req.query;

    const authorized = await isFacultyForClub(req.user, clubId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not supervise this club.'
      });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found.' });
    }

    let query = {
      role: { $in: ['student', 'organizer'] },
      isActive: true
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email role department programme yearOfStudy registerNumber clubs')
      .limit(30)
      .lean();

    const currentOrganizerIds = new Set(club.organizers.map((o) => o.toString()));

    const enriched = users.map((u) => ({
      ...u,
      isOrganizerForThisClub: currentOrganizerIds.has(u._id.toString())
    }));

    res.status(200).json({
      success: true,
      count: enriched.length,
      students: enriched
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClubs,
  getClubById,
  getMyAuthorizedClubs,
  createClub,
  updateClub,
  deleteClub,
  assignClubOrganizer,
  revokeClubOrganizer,
  getEligibleStudents
};
