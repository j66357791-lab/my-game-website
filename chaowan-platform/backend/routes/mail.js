const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserMails, claimMail } = require('../controllers/mailController');

router.route('/').get(protect, getUserMails);
router.route('/:mailId/claim').post(protect, claimMail);

module.exports = router;
