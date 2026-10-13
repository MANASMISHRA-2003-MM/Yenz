const express = require('express');
const router = express.Router();
const { getRoute, snapCoordinate, getOrderActiveRoute } = require('./routingController');

// Calculate route
router.get('/route', getRoute);

// Snap point to road
router.post('/snap', snapCoordinate);

// Get stage-aware active road route for an order
router.get('/order-route/:orderId', getOrderActiveRoute);

module.exports = router;
