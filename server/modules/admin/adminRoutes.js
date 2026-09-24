const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getUsers,
  updateUser,
  resolveDispute
} = require('./adminController');
const { protect, authorize } = require('../../middlewares/authMiddleware');
const { adminRateLimiter } = require('../../middlewares/rateLimiter');

router.use(protect, authorize('admin'));

router.get('/metrics', adminRateLimiter, getAdminMetrics);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.put('/disputes/:orderId', resolveDispute);

module.exports = router;
