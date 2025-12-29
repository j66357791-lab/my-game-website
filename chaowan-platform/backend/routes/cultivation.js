// backend/routes/cultivation.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// ✅ 修改：使用解构赋值直接引入具体的函数
const { 
    initProfile, 
    getData, 
    cultivateClaim, 
    allocatePoint, 
    breakthrough, 
    enhanceEquipment, 
    challengeDungeon 
} = require('../controllers/cultivationController');

// ✅ 使用时直接使用函数名，不需要 controller.
router.post('/init', auth, initProfile);
router.get('/data', auth, getData);
router.post('/claim', auth, cultivateClaim);
router.post('/allocate', auth, allocatePoint);
router.post('/breakthrough', auth, breakthrough);
router.post('/enhance', auth, enhanceEquipment);
router.post('/dungeon', auth, challengeDungeon);

module.exports = router;
