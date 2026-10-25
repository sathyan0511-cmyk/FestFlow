const express = require('express');
const router = express.Router();
const {
  getClubs,
  getClubById,
  getMyAuthorizedClubs,
  createClub,
  updateClub,
  deleteClub,
  assignClubOrganizer,
  revokeClubOrganizer,
  getEligibleStudents
} = require('../controllers/clubController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(getClubs)
  .post(protect, authorize('admin', 'organizer'), createClub);

router.get('/my-authorized', protect, authorize('admin', 'organizer', 'faculty'), getMyAuthorizedClubs);

router.route('/:id/organizers')
  .post(protect, authorize('admin', 'faculty'), assignClubOrganizer);

router.route('/:id/organizers/:studentId')
  .delete(protect, authorize('admin', 'faculty'), revokeClubOrganizer);

router.get('/:id/eligible-students', protect, authorize('admin', 'faculty'), getEligibleStudents);

router.route('/:id')
  .get(getClubById)
  .put(protect, authorize('admin', 'organizer', 'faculty'), updateClub)
  .delete(protect, authorize('admin'), deleteClub);

module.exports = router;
