const Volunteer = require('../models/Volunteer');
const Event = require('../models/Event');

// @desc    Apply as a volunteer for an event
// @route   POST /api/volunteers/apply
// @access  Private
const applyVolunteer = async (req, res, next) => {
  try {
    const { eventId, preferredTask = 'Logistics & Stage Support' } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existing = await Volunteer.findOne({ event: eventId, user: req.user.id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied as a volunteer for this event',
        volunteer: existing
      });
    }

    const volunteer = await Volunteer.create({
      event: eventId,
      user: req.user.id,
      assignedTask: preferredTask,
      volunteerStatus: 'applied'
    });

    res.status(201).json({
      success: true,
      message: 'Volunteer application submitted successfully!',
      volunteer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer task, shift, and status
// @route   PUT /api/volunteers/:id
// @access  Private (Admin, Organizer)
const updateVolunteerStatus = async (req, res, next) => {
  try {
    const { assignedTask, shiftStart, shiftEnd, volunteerStatus } = req.body;

    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      {
        ...(assignedTask && { assignedTask }),
        ...(shiftStart && { shiftStart }),
        ...(shiftEnd && { shiftEnd }),
        ...(volunteerStatus && { volunteerStatus })
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email department phone');

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Volunteer record updated successfully',
      volunteer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get volunteers for an event
// @route   GET /api/volunteers/event/:eventId
// @access  Private (Admin, Organizer)
const getEventVolunteers = async (req, res, next) => {
  try {
    const volunteers = await Volunteer.find({ event: req.params.eventId })
      .populate('user', 'name email phone department registerNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: volunteers.length,
      volunteers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's volunteering assignments
// @route   GET /api/volunteers/my
// @access  Private
const getMyVolunteering = async (req, res, next) => {
  try {
    const volunteering = await Volunteer.find({ user: req.user.id })
      .populate('event', 'title startDate endDate venue')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: volunteering.length,
      volunteering
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyVolunteer,
  updateVolunteerStatus,
  getEventVolunteers,
  getMyVolunteering
};
