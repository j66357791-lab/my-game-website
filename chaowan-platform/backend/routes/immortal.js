const { getMyDoll, createDoll, collectSpirit, upgradeSpiritPool, levelUp, attemptBreakthrough, allocateAttributes } = require('../controllers/immortalController');

router.use(protect);

router.get('/my-doll', getMyDoll);
router.post('/create', createDoll);
router.post('/collect-spirit', collectSpirit);
router.post('/upgrade-pool', upgradeSpiritPool);
router.post('/level-up', levelUp); // ✅ 新增
router.post('/breakthrough', attemptBreakthrough);
router.post('/allocate-attribute', allocateAttributes);

module.exports = router;
