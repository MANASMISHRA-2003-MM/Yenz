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

router.post('/', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), createFoodItem);
router.put('/:id', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), updateFoodItem);
router.delete('/:id', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), deleteFoodItem);

router.post('/:id/variants', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), createProductVariant);
router.put('/variants/:variantId', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), updateProductVariant);
router.delete('/variants/:variantId', protect, authorize('VENDOR', 'ADMIN', 'vendor', 'admin'), deleteProductVariant);

module.exports = router;
