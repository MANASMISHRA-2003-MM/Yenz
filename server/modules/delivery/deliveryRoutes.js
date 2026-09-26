const express = require('express');
const router = express.Router();
const {
  getDeliveryDashboard,
  toggleOnlineStatus,
  submitDeliveryApplication,
  getMyDeliveryApplication,
  updateDeliveryStatus
} = require('./deliveryController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.post('/application', protect, submitDeliveryApplication);
router.get('/application/me', protect, getMyDeliveryApplication);

router.get('/dashboard', protect, authorize('DELIVERY_PARTNER', 'ADMIN', 'delivery_partner', 'admin'), getDeliveryDashboard);
router.put('/toggle-online', protect, authorize('DELIVERY_PARTNER', 'ADMIN', 'delivery_partner', 'admin'), toggleOnlineStatus);
router.put('/:id/status', protect, authorize('DELIVERY_PARTNER', 'ADMIN', 'delivery_partner', 'admin'), updateDeliveryStatus);

module.exports = router;
