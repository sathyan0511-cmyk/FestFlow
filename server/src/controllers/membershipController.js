const ClubMembership = require('../models/ClubMembership');
const Club = require('../models/Club');

// @desc    Apply / Join a Club
// @route   POST /api/memberships
// @access  Private
const joinClub = async (req, res, next) => {
  try {
    const { clubId, role = 'member', memberType = 'student' } = req.body;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const existing = await ClubMembership.findOne({ club: clubId, user: req.user.id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied or are an active member of this club'
      });
    }

    const membership = await ClubMembership.create({
      club: clubId,
      user: req.user.id,
      memberType,
      role,
      membershipStatus: 'active'
    });

    const populated = await ClubMembership.findById(membership._id)
      .populate('club', 'name category')
      .populate('user', 'name email department');

    res.status(201).json({
      success: true,
      message: `Joined ${club.name} successfully!`,
      membership: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get members of a club
// @route   GET /api/memberships/club/:clubId
// @access  Public
const getClubMembers = async (req, res, next) => {
  try {
    const members = await ClubMembership.find({ club: req.params.clubId })
      .populate('user', 'name email department programme yearOfStudy phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: members.length,
      members
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's club memberships
// @route   GET /api/memberships/my
// @access  Private
const getMyMemberships = async (req, res, next) => {
  try {
    const memberships = await ClubMembership.find({ user: req.user.id })
      .populate('club', 'name category description contactEmail')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: memberships.length,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  joinClub,
  getClubMembers,
  getMyMemberships
};
