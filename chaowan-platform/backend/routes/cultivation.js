const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');

const { initProfile, getData, cultivateClaim, allocatePoint, breakthrough, enhanceEquipment, challengeDungeon } = require('../controllers/cultivationController');

router.post('/init', auth, initProfile);
router.get('/data', auth, getData);
router.post('/claim', auth, cultivateClaim);
router.post('/allocate', auth, allocatePoint);
router.post('/breakthrough', auth, breakthrough);
router.post('/enhance', auth, enhanceEquipment);
router.post('/dungeon', auth, challengeDungeon);

module.exports = router;
