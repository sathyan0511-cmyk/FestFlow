const express = require('express');
const router = express.Router();
const {
  applyVolunteer,
  updateVolunteerStatus,
  getEventVolunteers,
  getMyVolunteering
} = require('../controllers/volunteerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/apply', protect, applyVolunteer);
router.get('/my', protect, getMyVolunteering);
router.get('/event/:eventId', protect, authorize('admin', 'organizer'), getEventVolunteers);
router.put('/:id', protect, authorize('admin', 'organizer'), updateVolunteerStatus);

module.exports = router;
