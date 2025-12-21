// backend/routes/race.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { startRace, getRaceHistory, getRecentRaces } = require('../controllers/raceController');

// 所有路由都需要认证
router.use(protect);

// 开始龟兔赛跑
router.post('/start', startRace);

// 获取用户赛跑历史
router.get('/history', getRaceHistory);

// 获取最近10次赛跑结果
router.get('/recent', getRecentRaces);

module.exports = router;
