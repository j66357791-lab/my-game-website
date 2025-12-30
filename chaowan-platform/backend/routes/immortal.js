const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getMyDoll,
  createDoll,
  collectSpirit,
  upgradeSpiritPool,
  levelUp,
  attemptBreakthrough,
  allocateAttributes,
  challengeDungeon,
  getInventory,
  equipItem
} = require('../controllers/immortalController');

router.use(protect);

router.get('/my-doll', getMyDoll);
router.post('/create', createDoll);
router.post('/collect-spirit', collectSpirit);
router.post('/upgrade-pool', upgradeSpiritPool);
router.post('/level-up', levelUp);
router.post('/breakthrough', attemptBreakthrough);
router.post('/allocate-attribute', allocateAttributes);
router.post('/dungeon/challenge', challengeDungeon);
router.get('/equipment/inventory', getInventory);      // ✅ 新增
router.post('/equipment/equip', equipItem);              // ✅ 新增

module.exports = router;
