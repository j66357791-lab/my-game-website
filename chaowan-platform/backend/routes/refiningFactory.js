const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getActivityData,
  inputChars,
  withdrawChars,
  claimPoints,
  getHistory
} = require('../controllers/refiningFactoryController');

const router = express.Router();

router.use(protect);

router.get('/data', getActivityData);
router.post('/input', inputChars);
router.post('/withdraw', withdrawChars);
router.post('/claim', claimPoints);
router.get('/history', getHistory);

module.exports = router;
