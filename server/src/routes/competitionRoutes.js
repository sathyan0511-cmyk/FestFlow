const express = require('express');
const router = express.Router();
const {
  createCompetition,
  getCompetitionsByEvent,
  getCompetitionDetails,
  registerTeam,
  addJudgingCriteria,
  addJudge,
  submitScore,
  addPrize,
  declareResult
} = require('../controllers/competitionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('admin', 'organizer'), createCompetition);
router.get('/event/:eventId', getCompetitionsByEvent);
router.get('/:id', getCompetitionDetails);
router.post('/teams', protect, registerTeam);
router.post('/criteria', protect, authorize('admin', 'organizer'), addJudgingCriteria);
router.post('/judges', protect, authorize('admin', 'organizer'), addJudge);
router.post('/scores', protect, authorize('admin', 'organizer'), submitScore);
router.post('/prizes', protect, authorize('admin', 'organizer'), addPrize);
router.post('/results', protect, authorize('admin', 'organizer'), declareResult);

module.exports = router;
