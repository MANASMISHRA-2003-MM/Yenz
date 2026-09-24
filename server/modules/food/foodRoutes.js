const express = require('express');
const router = express.Router();
const { getFoods, createFoodItem, updateFoodItem, deleteFoodItem } = require('./foodController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getFoods);
router.post('/', protect, authorize('vendor', 'admin'), createFoodItem);
router.put('/:id', protect, authorize('vendor', 'admin'), updateFoodItem);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteFoodItem);

module.exports = router;
