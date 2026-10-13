const express = require('express');
const router = express.Router();
const { createReview, getRestaurantReviews } = require('./reviewController');
const { protect } = require('../../middlewares/authMiddleware');

router.post('/', protect, createReview);
router.get('/restaurant/:restaurantId', getRestaurantReviews);

module.exports = router;
