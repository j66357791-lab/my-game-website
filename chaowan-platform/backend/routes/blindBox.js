const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getActivityData,
  singleDraw,
  tenDraw,
  exchangeReward,
  getExchangeHistory
} = require('../controllers/blindBoxController');

const router = express.Router();

router.use(protect);

router.get('/activity', getActivityData);
router.post('/single-draw', singleDraw);
router.post('/ten-draw', tenDraw);
router.post('/exchange', exchangeReward);
router.get('/exchange-history', getExchangeHistory);

module.exports = router;
