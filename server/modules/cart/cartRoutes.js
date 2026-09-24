const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  applyCoupon,
  clearCart
} = require('./cartController');
const { protect } = require('../../middlewares/authMiddleware');

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.put('/update', protect, updateCartItem);
router.post('/coupon', protect, applyCoupon);
router.delete('/', protect, clearCart);

module.exports = router;
