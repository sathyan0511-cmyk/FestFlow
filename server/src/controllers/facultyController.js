const User = require('../models/User');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const Event = require('../models/Event');
const bcrypt = require('bcryptjs');
const { getSupervisedClubIds } = require('../utils/clubAuthorization');

// @desc    Get all faculty members
// @route   GET /api/faculty
// @access  Private (Admin only)
const getAllFaculty = async (req, res, next) => {
  try {
    const facultyMembers = await User.find({ role: 'faculty' })
      .select('name email role department phone isActive createdAt clubs')
      .populate('clubs', 'name category facultyCoordinator')
      .sort({ createdAt: -1 });

    // Also enrich with clubs where facultyCoordinator.user matches
    const enriched = await Promise.all(
      facultyMembers.map(async (f) => {
        const supervisedClubs = await Club.find({
          $or: [
            { 'facultyCoordinator.user': f._id },
            { 'facultyCoordinator.email': f.email.toLowerCase() },
            { _id: { $in: f.clubs || [] } }
          ]
        }).select('name category status facultyCoordinator');

        const obj = f.toObject();
        obj.assignedClubs = supervisedClubs;
        return obj;
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      faculty: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new faculty account
// @route   POST /api/faculty
// @access  Private (Admin only)
const createFaculty = async (req, res, next) => {
  try {
    const { name, email, password, department, phone, clubIds = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this email address already exists.'
      });
    }

    const faculty = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'faculty',
      department,
      phone,
      clubs: clubIds
    });

    // Assign faculty to target clubs
    if (Array.isArray(clubIds) && clubIds.length > 0) {
      for (const clubId of clubIds) {
        await Club.findByIdAndUpdate(clubId, {
          'facultyCoordinator.user': faculty._id,
          'facultyCoordinator.name': faculty.name,
          'facultyCoordinator.email': faculty.email,
          'facultyCoordinator.department': faculty.department || department,
          'facultyCoordinator.phone': faculty.phone || phone
        });

        await ClubMembership.findOneAndUpdate(
          { club: clubId, user: faculty._id },
          {
            club: clubId,
            user: faculty._id,
            memberType: 'faculty',
            role: 'coordinator',
            membershipStatus: 'active'
          },
          { upsert: true, new: true }
        );
      }
    }

    const populated = await User.findById(faculty._id)
      .select('-password')
      .populate('clubs', 'name category');

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      faculty: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a faculty account and assigned clubs
// @route   PUT /api/faculty/:id
// @access  Private (Admin only)
const updateFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, department, phone, isActive, clubIds } = req.body;

    let faculty = await User.findById(id);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (name) faculty.name = name;
    if (department) faculty.department = department;
    if (phone !== undefined) faculty.phone = phone;
    if (isActive !== undefined) faculty.isActive = isActive;

    if (Array.isArray(clubIds)) {
      const prevClubIds = (faculty.clubs || []).map((c) => c.toString());
      faculty.clubs = clubIds;

      // Unassign clubs that were removed
      const removedClubs = prevClubIds.filter((cId) => !clubIds.includes(cId));
      for (const remId of removedClubs) {
        await Club.findByIdAndUpdate(remId, {
          'facultyCoordinator.user': null
        });
        await ClubMembership.findOneAndDelete({ club: remId, user: faculty._id });
      }

      // Assign new clubs
      for (const newId of clubIds) {
        await Club.findByIdAndUpdate(newId, {
          'facultyCoordinator.user': faculty._id,
          'facultyCoordinator.name': faculty.name,
          'facultyCoordinator.email': faculty.email,
          'facultyCoordinator.department': faculty.department,
          'facultyCoordinator.phone': faculty.phone
        });

        await ClubMembership.findOneAndUpdate(
          { club: newId, user: faculty._id },
          {
            club: newId,
            user: faculty._id,
            memberType: 'faculty',
            role: 'coordinator',
            membershipStatus: 'active'
          },
          { upsert: true, new: true }
        );
      }
    }

    await faculty.save();

    const updated = await User.findById(id)
      .select('-password')
      .populate('clubs', 'name category');

    res.status(200).json({
      success: true,
      message: 'Faculty account updated successfully.',
      faculty: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate a faculty account
// @route   DELETE /api/faculty/:id
// @access  Private (Admin only)
const deleteFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faculty = await User.findById(id);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    faculty.isActive = false;
    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Faculty account deactivated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get supervised clubs for currently logged in faculty member
// @route   GET /api/faculty/my-supervised
// @access  Private (Faculty, Admin)
const getMySupervisedClubs = async (req, res, next) => {
  try {
    const supervisedClubIds = await getSupervisedClubIds(req.user);
    const clubs = await Club.find({ _id: { $in: supervisedClubIds } })
      .populate('organizers', 'name email department phone registerNumber')
      .populate('facultyCoordinator.user', 'name email department phone')
      .sort({ name: 1 });

    const now = new Date();
    const clubIds = clubs.map((c) => c._id);

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

    const enriched = clubs.map((c) => {
      const obj = c.toObject();
      obj.upcomingEventsCount = upcomingMap[c._id.toString()] || 0;
      obj.totalEventsCount = allEventsMap[c._id.toString()] || 0;
      obj.membersCount = membersMap[c._id.toString()] || 0;
      obj.organizersCount = c.organizers ? c.organizers.length : 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      clubs: enriched
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getMySupervisedClubs
};
