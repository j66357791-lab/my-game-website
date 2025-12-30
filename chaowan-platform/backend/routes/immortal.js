const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyDoll, createDoll } = require('../controllers/immortalController');

router.use(protect);

router.get('/my-doll', getMyDoll);
router.post('/create', createDoll);

module.exports = router;
