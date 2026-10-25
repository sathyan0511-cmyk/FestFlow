const express = require('express');
const router = express.Router();
const {
  getAuthorizedFinanceEvents,
  getEventFinancials,
  setEventBudget,
  addExpense,
  addRevenue
} = require('../controllers/financeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect, authorize('admin', 'organizer', 'faculty'));

router.get('/events', getAuthorizedFinanceEvents);
router.get('/event/:eventId', getEventFinancials);
router.post('/budget', setEventBudget);
router.post('/expense', addExpense);
router.post('/revenue', addRevenue);

module.exports = router;
