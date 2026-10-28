const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { isAuthorizedForClub } = require('../utils/clubAuthorization');

// @desc    Register logged-in student for an event
// @route   POST /api/registrations
// @access  Private (Student, Participant)
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId, registrationType = 'solo' } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for registration.'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    if (event.status !== 'published' && event.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: `Registration is not open for this event (current status: ${event.status}).`
      });
    }

    const now = new Date();
    if (now > new Date(event.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline for this event has passed.'
      });
    }

    const existingRegistration = await Registration.findOne({
      user: req.user.id,
      event: event._id
    });

    if (existingRegistration && existingRegistration.registrationStatus !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event.',
        ticketNumber: existingRegistration.ticketNumber
      });
    }

    // Check available capacity
    const currentActiveCount = await Registration.countDocuments({
      event: event._id,
      registrationStatus: { $ne: 'cancelled' }
    });

    if (currentActiveCount >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Registration is full. Maximum participant limit reached.'
      });
    }

    const ticketNumber = `FF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let registration;
    if (existingRegistration && existingRegistration.registrationStatus === 'cancelled') {
      // Reactivate previously cancelled registration
      existingRegistration.registrationStatus = 'registered';
      existingRegistration.registrationDate = new Date();
      existingRegistration.registrationType = registrationType;
      existingRegistration.ticketNumber = ticketNumber;
      existingRegistration.cancellationDate = null;
      existingRegistration.cancellationReason = null;
      registration = await existingRegistration.save();
    } else {
      registration = await Registration.create({
        user: req.user.id,
        event: event._id,
        registrationType,
        registrationStatus: 'registered',
        ticketNumber,
        fee: event.registrationFee || 0,
        qrCode: `FESTFLOW:TICKET:${ticketNumber}:${event._id}:${req.user.id}`
      });
    }

    const populated = await Registration.findById(registration._id)
      .populate('event', 'title startDate endDate startTime venue club')
      .populate('user', 'name email department registerNumber');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event!',
      registration: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get registrations of logged in student
// @route   GET /api/registrations/my
// @access  Private
const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user.id })
      .populate({
        path: 'event',
        select: 'title description eventType startDate endDate startTime endTime status venue club',
        populate: [
          { path: 'club', select: 'name category' },
          { path: 'venue', select: 'name location capacity' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a registration
// @route   PUT /api/registrations/:id/cancel
// @access  Private
const cancelRegistration = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (
      registration.user.toString() !== req.user.id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    if (registration.registrationStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This registration has already been cancelled.'
      });
    }

    registration.registrationStatus = 'cancelled';
    registration.cancellationDate = new Date();
    registration.cancellationReason = reason || 'Cancelled by user';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations for an event (Admin & Organizers)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Admin, Organizer)
const getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Not authorized to view attendee registrations for this club.'
      });
    }

    const registrations = await Registration.find({ event: event._id })
      .populate('user', 'name email phone department registerNumber yearOfStudy collegeName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations
};
