const express = require('express');
const router = express.Router();
const {
  getFoods,
  getFoodById,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductPriceHistory
} = require('./foodController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

router.get('/', getFoods);
router.get('/:id', getFoodById);
router.get('/:id/price-history', getProductPriceHistory);

router.post('/', protect, authorize('ADMIN', 'admin'), createFoodItem);
router.put('/:id', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), updateFoodItem);
router.delete('/:id', protect, authorize('ADMIN', 'admin'), deleteFoodItem);

router.post('/:id/variants', protect, authorize('ADMIN', 'admin'), createProductVariant);
router.put('/variants/:variantId', protect, authorize('ADMIN', 'admin'), updateProductVariant);
router.delete('/variants/:variantId', protect, authorize('ADMIN', 'admin'), deleteProductVariant);

module.exports = router;
