const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  acceptDeliveryJob,
  assignDeliveryPartner
} = require('./orderController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.post('/', protect, authorize('customer', 'consumer', 'CUSTOMER', 'admin', 'ADMIN'), createOrder);
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/accept-job', protect, authorize('delivery_partner', 'admin', 'DELIVERY_PARTNER', 'ADMIN'), acceptDeliveryJob);
router.put('/:id/assign-delivery', protect, authorize('admin', 'ADMIN'), assignDeliveryPartner);

module.exports = router;
