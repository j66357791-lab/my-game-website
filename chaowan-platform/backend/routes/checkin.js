// backend/routes/checkin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkinController = require('../controllers/checkinController');

router.get('/status', auth, checkinController.getCheckinStatus);
router.post('/', auth, checkinController.performCheckin);

module.exports = router;
