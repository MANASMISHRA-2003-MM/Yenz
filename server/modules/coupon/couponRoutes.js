const express = require('express');
const router = express.Router();
const { getCoupons, createCoupon, deleteCoupon } = require('./couponController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

module.exports = router;
