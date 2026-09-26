const express = require('express');
const router = express.Router();
const {
  getRestaurants,
  getRestaurantById,
  getMyVendorRestaurant,
  updateRestaurant,
  createVendor,
  submitVendorApplication,
  getMyVendorApplication
} = require('./restaurantController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getRestaurants);
router.post('/', protect, authorize('ADMIN', 'admin'), createVendor);

router.post('/application', protect, submitVendorApplication);
router.get('/application/me', protect, getMyVendorApplication);

router.get('/vendor/me', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), getMyVendorRestaurant);
router.get('/:id', getRestaurantById);
router.put('/:id', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), updateRestaurant);

module.exports = router;
