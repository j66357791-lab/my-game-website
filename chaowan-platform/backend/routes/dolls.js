// backend/routes/dolls.js - 新玩法完整版
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // 🔧 统一使用解构出的 protect
const dollController = require('../controllers/dollController');

// --- 新玩法核心路由 ---

// 抽取娃娃
router.post('/draw', protect, dollController.drawDoll);

// 获取用户背包中的娃娃 (空闲状态)
router.get('/inventory', protect, dollController.getDollInventory);

// 派遣娃娃出战
router.post('/deploy', protect, dollController.deployDoll);

// 召回娃娃
router.post('/recall', protect, dollController.recallDoll);

// 获取出战位的娃娃
router.get('/deployment', protect, dollController.getDeploymentSlots);

// 合成娃娃
router.post('/synthesize', protect, dollController.synthesizeDoll);

module.exports = router;
