const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getMyDoll, createDoll, collectSpirit, upgradeSpiritPool,
  levelUp, attemptBreakthrough, allocateAttributes, challengeDungeon,
  getInventory, equipItem, unequipItem, refineItem, starUpItem, decomposeItem
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
router.get('/equipment/inventory', getInventory);
router.post('/equipment/equip', equipItem);
router.post('/equipment/unequip', unequipItem);      // ✅ 新增
router.post('/equipment/refine', refineItem);        // ✅ 新增
router.post('/equipment/star-up', starUpItem);        // ✅ 新增
router.post('/equipment/decompose', decomposeItem);  // ✅ 新增

module.exports = router;
