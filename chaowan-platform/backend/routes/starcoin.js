const express = require('express');
const router = express.Router();
const starcoinController = require('../controllers/starcoinController');
const auth = require('../middleware/auth'); 

router.post('/order', auth, starcoinController.placeOrder);
router.get('/klines', starcoinController.getKlines);
router.get('/depth', starcoinController.getDepth);

module.exports = router;
