const express = require('express');
const router = express.Router();
const { submitFeedback, getEventFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitFeedback);
router.get('/event/:eventId', getEventFeedback);

module.exports = router;
