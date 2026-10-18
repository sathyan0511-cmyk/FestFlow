const express = require('express');
const router = express.Router();
const {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue
} = require('../controllers/venueController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getVenues)
  .post(protect, authorize('admin', 'organizer'), createVenue);

router.route('/:id')
  .get(getVenueById)
  .put(protect, authorize('admin'), updateVenue)
  .delete(protect, authorize('admin'), deleteVenue);

module.exports = router;
