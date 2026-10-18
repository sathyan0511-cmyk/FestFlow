const Certificate = require('../models/Certificate');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Issue a certificate to a student/participant
// @route   POST /api/certificates
// @access  Private (Admin, Organizer)
const issueCertificate = async (req, res, next) => {
  try {
    const { eventId, userId, certificateType = 'participation' } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }

    // Check if certificate already issued of this type for this event
    const existing = await Certificate.findOne({
      event: eventId,
      user: userId,
      certificateType
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this user and event',
        certificate: existing
      });
    }

    const certificateNo = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const verificationCode = `V-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const certificate = await Certificate.create({
      certificateNo,
      certificateType,
      event: eventId,
      user: userId,
      verificationCode,
      status: 'issued'
    });

    const populated = await Certificate.findById(certificate._id)
      .populate('event', 'title startDate endDate')
      .populate('user', 'name email department registerNumber');

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's certificates
// @route   GET /api/certificates/my
// @access  Private
const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ user: req.user.id })
      .populate({
        path: 'event',
        select: 'title eventType startDate venue club',
        populate: [
          { path: 'club', select: 'name' },
          { path: 'venue', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify certificate authenticity by code
// @route   GET /api/certificates/verify/:code
// @access  Public
const verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      verificationCode: req.params.code.toUpperCase()
    })
      .populate('event', 'title startDate endDate eventType')
      .populate('user', 'name department registerNumber');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or unrecognized certificate verification code.'
      });
    }

    res.status(200).json({
      success: true,
      valid: certificate.status === 'issued',
      certificate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all certificates issued for an event
// @route   GET /api/certificates/event/:eventId
// @access  Private (Admin, Organizer)
const getEventCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ event: req.params.eventId })
      .populate('user', 'name email department registerNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issueCertificate,
  getMyCertificates,
  verifyCertificate,
  getEventCertificates
};
