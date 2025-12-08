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

// 所有路由都需要认证
router.use(protect);

// 获取活动数据
router.get('/activity', getActivityData);

// 单抽
router.post('/single-draw', singleDraw);

// 十连抽
router.post('/ten-draw', tenDraw);

// 兑换奖励
router.post('/exchange', exchangeReward);

// 获取兑换记录
router.get('/exchange-history', getExchangeHistory);

module.exports = router;
