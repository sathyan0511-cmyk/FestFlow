const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, registerForEvent);
router.get('/my', protect, getMyRegistrations);
router.put('/:id/cancel', protect, cancelRegistration);
router.get('/event/:eventId', protect, authorize('admin', 'organizer'), getEventRegistrations);

module.exports = router;
