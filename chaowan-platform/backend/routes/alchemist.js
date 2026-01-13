const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAlchemistData,
  buyGardenItem,
  unlockPlot,
  restoreDurability,
  plantCrop,
  harvestCrop,
  startRefining,
  collectPill,
  usePill
} = require('../controllers/alchemistController');

router.use(protect);

router.get('/data', getAlchemistData);

// 药园商店
router.post('/shop/buy', buyGardenItem);

// 药园管理
router.post('/garden/unlock', unlockPlot);
router.post('/garden/fertilize', restoreDurability);
router.post('/garden/plant', plantCrop);
router.post('/garden/harvest', harvestCrop);

// 炼丹
router.post('/refine/start', startRefining);
router.post('/refine/collect', collectPill);

// 服用丹药
router.post('/pill/use', usePill);

module.exports = router;
