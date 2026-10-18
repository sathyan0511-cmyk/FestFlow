const Venue = require('../models/Venue');
const Event = require('../models/Event');

// @desc    Get all venues
// @route   GET /api/venues
// @access  Public
const getVenues = async (req, res, next) => {
  try {
    const { venueType, status, minCapacity } = req.query;
    let query = {};

    if (venueType) query.venueType = venueType;
    if (status) query.status = status;
    if (minCapacity) query.capacity = { $gte: Number(minCapacity) };

    const venues = await Venue.find(query).sort({ capacity: -1 });

    res.status(200).json({
      success: true,
      count: venues.length,
      venues
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single venue by ID
// @route   GET /api/venues/:id
// @access  Public
const getVenueById = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Get upcoming events at this venue
    const upcomingEvents = await Event.find({
      venue: venue._id,
      endDate: { $gte: new Date() }
    }).select('title startDate endDate startTime endTime status');

    res.status(200).json({
      success: true,
      venue,
      upcomingEvents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new venue
// @route   POST /api/venues
// @access  Private (Admin, Organizer)
const createVenue = async (req, res, next) => {
  try {
    const { name, location, capacity, venueType, facilities, status } = req.body;

    const existing = await Venue.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A venue with this name already exists'
      });
    }

    const venue = await Venue.create({
      name,
      location,
      capacity,
      venueType,
      facilities: facilities || [],
      status: status || 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      venue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a venue
// @route   PUT /api/venues/:id
// @access  Private (Admin)
const updateVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Venue updated successfully',
      venue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a venue
// @route   DELETE /api/venues/:id
// @access  Private (Admin)
const deleteVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Check if venue has upcoming events
    const activeEventsCount = await Event.countDocuments({
      venue: venue._id,
      endDate: { $gte: new Date() }
    });

    if (activeEventsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete venue: it is scheduled for ${activeEventsCount} upcoming event(s).`
      });
    }

    await venue.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue
};
