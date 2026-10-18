const express = require('express');
const router = express.Router();
const {
  createSponsor,
  getSponsors,
  linkEventSponsor,
  getEventSponsors
} = require('../controllers/sponsorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getSponsors);
router.post('/', protect, authorize('admin', 'organizer'), createSponsor);
router.post('/event', protect, authorize('admin', 'organizer'), linkEventSponsor);
router.get('/event/:eventId', getEventSponsors);

module.exports = router;
