const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Submit feedback for an event
// @route   POST /api/feedback
// @access  Private
const submitFeedback = async (req, res, next) => {
  try {
    const { eventId, rating, comments } = req.body;

    if (!eventId || !rating) {
      return res.status(400).json({ success: false, message: 'Event ID and rating are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { event: eventId, user: req.user.id },
      {
        rating: Number(rating),
        comments: comments || '',
        submittedDate: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('user', 'name department');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for your review!',
      feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for an event
// @route   GET /api/feedback/event/:eventId
// @access  Public
const getEventFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ event: req.params.eventId })
      .populate('user', 'name department')
      .sort({ createdAt: -1 });

    const totalRatings = feedbacks.length;
    const avgRating = totalRatings > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalRatings).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      count: totalRatings,
      avgRating: Number(avgRating),
      feedbacks
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getEventFeedback
};
