const express = require('express');
const router = express.Router();
const {
  issueCertificate,
  getMyCertificates,
  verifyCertificate,
  getEventCertificates
} = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('admin', 'organizer'), issueCertificate);
router.get('/my', protect, getMyCertificates);
router.get('/verify/:code', verifyCertificate);
router.get('/event/:eventId', protect, authorize('admin', 'organizer'), getEventCertificates);

module.exports = router;
