const express = require('express');
const router = express.Router();
const {
  processPayment,
  getMyPayments,
  getEventPayments
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, processPayment);
router.get('/my', protect, getMyPayments);
router.get('/event/:eventId', protect, authorize('admin', 'organizer'), getEventPayments);

module.exports = router;
