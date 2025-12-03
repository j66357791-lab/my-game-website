// routes/transfer.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const transferController = require('../controllers/transferController');

router.post('/', auth, transferController.processTransfer);

module.exports = router;
