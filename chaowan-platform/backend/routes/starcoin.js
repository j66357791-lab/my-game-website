const express = require('express');
const router = express.Router();
const starcoinController = require('../controllers/starcoinController');
const { protect } = require('../middleware/auth');

router.post('/order', protect, starcoinController.placeOrder); 
router.get('/klines', starcoinController.getKlines);
router.get('/depth', starcoinController.getDepth);

module.exports = router;

