const Event = require('../models/Event');
const Venue = require('../models/Venue');
const Club = require('../models/Club');
const Registration = require('../models/Registration');
const { isAuthorizedForClub, getAuthorizedClubIds } = require('../utils/clubAuthorization');

// @desc    Get all events with search, filtering, and live registration counts
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res, next) => {
  try {
    const { search, eventType, club, venue, status, upcoming } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (eventType) query.eventType = eventType;
    if (club) query.club = club;
    if (venue) query.venue = venue;
    if (status) query.status = status;

    if (upcoming === 'true') {
      query.endDate = { $gte: new Date() };
    }

    const events = await Event.find(query)
      .populate('club', 'name category contactEmail')
      .populate('venue', 'name location capacity venueType')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    // Aggregate registration counts for each event dynamically (without redundant storage)
    const eventIds = events.map((e) => e._id);
    const regCounts = await Registration.aggregate([
      {
        $match: {
          event: { $in: eventIds },
          registrationStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 }
        }
      }
    ]);

    const regCountMap = {};
    regCounts.forEach((r) => {
      regCountMap[r._id.toString()] = r.count;
    });

    const enrichedEvents = events.map((event) => {
      const obj = event.toObject();
      const currentRegistrations = regCountMap[event._id.toString()] || 0;
      obj.registeredCount = currentRegistrations;
      obj.availableSeats = Math.max(0, event.maxParticipants - currentRegistrations);
      obj.isFull = currentRegistrations >= event.maxParticipants;
      obj.isRegistrationClosed = new Date() > new Date(event.registrationDeadline);
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enrichedEvents.length,
      events: enrichedEvents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event by ID with stats
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'name description category contactEmail contactPhone')
      .populate('venue', 'name location capacity venueType facilities')
      .populate('organizers', 'name email department phone')
      .populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Dynamic count of active registrations
    const registeredCount = await Registration.countDocuments({
      event: event._id,
      registrationStatus: { $ne: 'cancelled' }
    });

    const obj = event.toObject();
    obj.registeredCount = registeredCount;
    obj.availableSeats = Math.max(0, event.maxParticipants - registeredCount);
    obj.isFull = registeredCount >= event.maxParticipants;
    obj.isRegistrationClosed = new Date() > new Date(event.registrationDeadline);

    res.status(200).json({
      success: true,
      event: obj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Admin, Organizer)
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      category,
      startDate,
      endDate,
      startTime,
      endTime,
      club,
      venue,
      maxParticipants,
      registrationDeadline,
      registrationFee,
      chiefGuest,
      organizers,
      status
    } = req.body;

    // Validate club exists
    const clubDoc = await Club.findById(club);
    if (!clubDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected club does not exist.'
      });
    }

    // Verify organizer or admin authorization for this specific club
    const authorized = await isAuthorizedForClub(req.user, clubDoc._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to create events for this club.'
      });
    }

    // Validate venue exists and capacity
    const venueDoc = await Venue.findById(venue);
    if (!venueDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected venue does not exist.'
      });
    }

    if (Number(maxParticipants) > venueDoc.capacity) {
      return res.status(400).json({
        success: false,
        message: `Max participants (${maxParticipants}) exceeds venue capacity (${venueDoc.capacity}).`
      });
    }

    // Date validations
    const start = new Date(startDate);
    const end = new Date(endDate);
    const deadline = new Date(registrationDeadline);

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    if (deadline > start) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline cannot be after the event start date.'
      });
    }

    const event = await Event.create({
      title,
      description,
      eventType,
      category: category || 'General',
      startDate: start,
      endDate: end,
      startTime,
      endTime,
      club,
      venue,
      maxParticipants: Number(maxParticipants),
      registrationDeadline: deadline,
      registrationFee: registrationFee ? Number(registrationFee) : 0,
      chiefGuest: chiefGuest || '',
      organizers: organizers && organizers.length > 0 ? organizers : [req.user.id],
      createdBy: req.user.id,
      status: status || 'published'
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('club', 'name category')
      .populate('venue', 'name location capacity');

    res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      event: populatedEvent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Admin, Organizer)
const updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permission: Admin or organizer of the owning club
    const authorizedSource = await isAuthorizedForClub(req.user, event.club);
    if (!authorizedSource) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to edit events for this club.'
      });
    }

    // If transferring event to another club, verify authorization for destination club
    if (req.body.club && req.body.club.toString() !== event.club.toString()) {
      const targetClubDoc = await Club.findById(req.body.club);
      if (!targetClubDoc) {
        return res.status(400).json({
          success: false,
          message: 'Target transfer club does not exist.'
        });
      }
      const authorizedTarget = await isAuthorizedForClub(req.user, targetClubDoc._id);
      if (!authorizedTarget) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to transfer events to the target club.'
        });
      }
    }

    // If venue is updated, check capacity
    if (req.body.venue || req.body.maxParticipants) {
      const targetVenueId = req.body.venue || event.venue;
      const targetMax = req.body.maxParticipants || event.maxParticipants;
      const venueDoc = await Venue.findById(targetVenueId);
      if (venueDoc && Number(targetMax) > venueDoc.capacity) {
        return res.status(400).json({
          success: false,
          message: `Max participants (${targetMax}) exceeds venue capacity (${venueDoc.capacity}).`
        });
      }
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('club', 'name category')
      .populate('venue', 'name location capacity');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Admin, Organizer)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permission: Admin or organizer of the owning club
    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete events for this club.'
      });
    }

    // Delete associated registrations
    await Registration.deleteMany({ event: event._id });
    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event and associated registrations deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
