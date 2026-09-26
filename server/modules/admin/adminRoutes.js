const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getUsers,
  updateUser,
  updateProductPrice,
  getProductPriceHistory,
  updateProductImage,
  createProductVariant,
  getVendorApplications,
  updateVendorApplicationStatus,
  getDeliveryPartnerApplications,
  updateDeliveryPartnerApplicationStatus,
  resolveDispute
} = require('./adminController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const { adminRateLimiter } = require('../../middlewares/rateLimiter');

router.use(protect, authorize('ADMIN'));

router.get('/metrics', adminRateLimiter, getAdminMetrics);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);

router.put('/products/:id/price', updateProductPrice);
router.get('/products/:id/price-history', getProductPriceHistory);
router.put('/products/:id/image', updateProductImage);
router.post('/products/:id/variants', createProductVariant);

router.get('/vendors/applications', getVendorApplications);
router.put('/vendors/applications/:id/status', updateVendorApplicationStatus);

router.get('/delivery-partners/applications', getDeliveryPartnerApplications);
router.put('/delivery-partners/applications/:id/status', updateDeliveryPartnerApplicationStatus);

router.put('/disputes/:orderId', resolveDispute);

module.exports = router;
