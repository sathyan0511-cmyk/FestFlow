const express = require('express');
const router = express.Router();
const {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub
} = require('../controllers/clubController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getClubs)
  .post(protect, authorize('admin', 'organizer'), createClub);

router.route('/:id')
  .get(getClubById)
  .put(protect, authorize('admin', 'organizer'), updateClub)
  .delete(protect, authorize('admin'), deleteClub);

module.exports = router;
