const Club = require('../models/Club');
const Event = require('../models/Event');

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

// @desc    Get single club by ID
// @route   GET /api/clubs/:id
// @access  Public
const getClubById = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id).populate(
      'organizers',
      'name email department phone'
    );

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Get events for this club
    const events = await Event.find({ club: club._id })
      .populate('venue', 'name location')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      club,
      events
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
    const isOrganizer = club.organizers.some(
      (org) => org.toString() === req.user.id.toString()
    );
    if (req.user.role !== 'admin' && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this club'
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

module.exports = {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub
};
