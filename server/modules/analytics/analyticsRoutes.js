const express = require('express');
const router = express.Router();
const { getAnalytics } = require('./analyticsController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', protect, authorize('admin', 'vendor'), getAnalytics);

module.exports = router;
