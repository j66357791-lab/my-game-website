const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

// ✅ 确保只引用一次，包含所有新接口
const {
  getMyDoll,
  createDoll,
  collectSpirit,
  upgradeSpiritPool,
  levelUp,
  attemptBreakthrough,
  allocateAttributes,
  challengeDungeon // ✅ 新增副本接口
} = require('../controllers/immortalController');

router.use(protect);

router.get('/my-doll', getMyDoll);
router.post('/create', createDoll);
router.post('/collect-spirit', collectSpirit);
router.post('/upgrade-pool', upgradeSpiritPool);
router.post('/level-up', levelUp);
router.post('/breakthrough', attemptBreakthrough);
router.post('/allocate-attribute', allocateAttributes);
router.post('/dungeon/challenge', challengeDungeon); // ✅ 新增副本路由

module.exports = router;
