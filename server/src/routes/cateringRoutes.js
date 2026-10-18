const express = require('express');
const router = express.Router();
const { getCateringByEvent, saveCatering } = require('../controllers/cateringController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/event/:eventId', getCateringByEvent);
router.post('/', protect, authorize('admin', 'organizer'), saveCatering);

module.exports = router;
