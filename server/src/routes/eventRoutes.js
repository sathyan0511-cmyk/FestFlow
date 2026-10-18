const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getEvents)
  .post(protect, authorize('admin', 'organizer'), createEvent);

router.route('/:id')
  .get(getEventById)
  .put(protect, authorize('admin', 'organizer'), updateEvent)
  .delete(protect, authorize('admin', 'organizer'), deleteEvent);

module.exports = router;
