const express = require('express');
const router = express.Router();
const { getDeliveryDashboard, toggleOnlineStatus } = require('./deliveryController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/dashboard', protect, authorize('delivery_partner', 'admin'), getDeliveryDashboard);
router.put('/toggle-online', protect, authorize('delivery_partner', 'admin'), toggleOnlineStatus);

module.exports = router;
