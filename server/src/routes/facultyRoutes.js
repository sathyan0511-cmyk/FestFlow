const express = require('express');
const router = express.Router();
const {
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getMySupervisedClubs
} = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(protect, authorize('admin'), getAllFaculty)
  .post(protect, authorize('admin'), createFaculty);

router.get('/my-supervised', protect, authorize('admin', 'faculty'), getMySupervisedClubs);

router.route('/:id')
  .put(protect, authorize('admin'), updateFaculty)
  .delete(protect, authorize('admin'), deleteFaculty);

module.exports = router;
