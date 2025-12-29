    // backend/routes/cultivation.js
    const express = require('express');
    const router = express.Router();
    const auth = require('../middleware/auth');

    // ✅ 确保这里解构了具体的函数
    const { 
        initProfile, 
        getData, 
        cultivateClaim, 
        allocatePoint, 
        breakthrough, 
        enhanceEquipment, 
        challengeDungeon 
    } = require('../controllers/cultivationController');

    // ✅ 确保这里也是用的具体函数名
    router.post('/init', auth, initProfile);
    router.get('/data', auth, getData);
    router.post('/claim', auth, cultivateClaim);
    router.post('/allocate', auth, allocatePoint);
    router.post('/breakthrough', auth, breakthrough);
    router.post('/enhance', auth, enhanceEquipment); // 这一行最关键，不能用 controller.xxx
    router.post('/dungeon', auth, challengeDungeon);

    module.exports = router;
    