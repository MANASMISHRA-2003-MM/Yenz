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

router.post('/', protect, authorize('consumer', 'admin'), createOrder);
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/accept-job', protect, authorize('delivery_partner', 'admin'), acceptDeliveryJob);
router.put('/:id/assign-delivery', protect, authorize('admin'), assignDeliveryPartner);

module.exports = router;
