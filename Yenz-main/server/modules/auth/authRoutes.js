const express = require('express');
const router = express.Router();
const { registerUser, loginUser, demoLogin, getMe } = require('./authController');
const { protect } = require('../../middlewares/authMiddleware');
const { authRateLimiter } = require('../../middlewares/rateLimiter');

router.post('/register', authRateLimiter, registerUser);
router.post('/login', authRateLimiter, loginUser);
router.post('/demo-login', demoLogin);
router.get('/me', protect, getMe);

module.exports = router;
