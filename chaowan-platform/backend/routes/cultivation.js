const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/cultivationController');

router.post('/init', auth, controller.initProfile);
router.get('/data', auth, controller.getData);
router.post('/claim', auth, controller.cultivateClaim);
router.post('/allocate', auth, controller.allocatePoint);
router.post('/breakthrough', auth, controller.breakthrough);
router.post('/enhance', auth, controller.enhanceEquipment);
router.post('/dungeon', auth, controller.challengeDungeon);

module.exports = router;
