const express = require('express');
// ✅ 补上这一行，否则报错 router is not defined
const router = express.Router(); 
const { getMyDoll, createDoll, collectSpirit, upgradeSpiritPool, levelUp, attemptBreakthrough, allocateAttributes, challengeDungeon } = require('../controllers/immortalController');

const { protect } = require('../middleware/auth');
const { getMyDoll, createDoll, collectSpirit, upgradeSpiritPool, levelUp, attemptBreakthrough, allocateAttributes } = require('../controllers/immortalController');

router.use(protect);

router.get('/my-doll', getMyDoll);
router.post('/create', createDoll);
router.post('/collect-spirit', collectSpirit);
router.post('/upgrade-pool', upgradeSpiritPool);
router.post('/level-up', levelUp);
router.post('/breakthrough', attemptBreakthrough);
router.post('/allocate-attribute', allocateAttributes);
// ✅ 新增：副本挑战
router.post('/dungeon/challenge', challengeDungeon);

module.exports = router;
