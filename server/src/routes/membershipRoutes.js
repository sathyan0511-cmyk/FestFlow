const express = require('express');
const router = express.Router();
const { joinClub, getClubMembers, getMyMemberships } = require('../controllers/membershipController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, joinClub);
router.get('/my', protect, getMyMemberships);
router.get('/club/:clubId', getClubMembers);

module.exports = router;
