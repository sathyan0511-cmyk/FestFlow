const { Sponsor, EventSponsor } = require('../models/Sponsor');
const { Revenue } = require('../models/Finance');
const Event = require('../models/Event');
const { isAuthorizedForClub } = require('../utils/clubAuthorization');

// @desc    Register a new sponsor organization
// @route   POST /api/sponsors
// @access  Private (Admin, Organizer)
const createSponsor = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, organizationType, address } = req.body;

    const sponsor = await Sponsor.create({
      name,
      contactPerson,
      email,
      phone,
      organizationType: organizationType || 'corporate',
      address
    });

    res.status(201).json({
      success: true,
      message: 'Sponsor organization registered successfully',
      sponsor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sponsors
// @route   GET /api/sponsors
// @access  Public
const getSponsors = async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: sponsors.length,
      sponsors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Link sponsor to an event (EVENT_SPONSOR)
// @route   POST /api/sponsors/event
// @access  Private (Admin, Organizer)
const linkEventSponsor = async (req, res, next) => {
  try {
    const { eventId, sponsorId, sponsorshipType, sponsorshipAmount, agreementDate, sponsorshipStatus } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const authorized = await isAuthorizedForClub(req.user, event.club);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to link sponsors to this club.'
      });
    }

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) return res.status(404).json({ success: false, message: 'Sponsor not found' });

    const eventSponsor = await EventSponsor.create({
      event: eventId,
      sponsor: sponsorId,
      sponsorshipType: sponsorshipType || 'Gold',
      sponsorshipAmount: Number(sponsorshipAmount),
      agreementDate: agreementDate || new Date(),
      sponsorshipStatus: sponsorshipStatus || 'confirmed'
    });

    // Auto record into Event Revenue
    if (Number(sponsorshipAmount) > 0) {
      await Revenue.create({
        event: eventId,
        revenueType: 'sponsorship',
        amount: Number(sponsorshipAmount),
        description: `${sponsorshipType || 'Gold'} Sponsorship from ${sponsor.name}`
      });
    }

    const populated = await EventSponsor.findById(eventSponsor._id)
      .populate('sponsor')
      .populate('event', 'title');

    res.status(201).json({
      success: true,
      message: 'Sponsorship linked and recorded to event revenue!',
      eventSponsor: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sponsorships for an event
// @route   GET /api/sponsors/event/:eventId
// @access  Public
const getEventSponsors = async (req, res, next) => {
  try {
    const sponsorships = await EventSponsor.find({ event: req.params.eventId })
      .populate('sponsor')
      .sort({ sponsorshipAmount: -1 });

    const totalSponsorship = sponsorships.reduce((sum, s) => sum + s.sponsorshipAmount, 0);

    res.status(200).json({
      success: true,
      count: sponsorships.length,
      totalSponsorship,
      sponsorships
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSponsor,
  getSponsors,
  linkEventSponsor,
  getEventSponsors
};
