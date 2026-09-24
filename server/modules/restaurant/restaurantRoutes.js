const express = require('express');
const router = express.Router();
const {
  getRestaurants,
  getRestaurantById,
  getMyVendorRestaurant,
  updateRestaurant
} = require('./restaurantController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getRestaurants);
router.get('/vendor/me', protect, authorize('vendor', 'admin'), getMyVendorRestaurant);
router.get('/:id', getRestaurantById);
router.put('/:id', protect, authorize('vendor', 'admin'), updateRestaurant);

module.exports = router;
