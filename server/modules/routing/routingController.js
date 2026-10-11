const prisma = require('../../utils/prisma');
const routingService = require('../../services/routingService');

/**
 * Calculate route between two coordinates
 * Query: originLat, originLng, destLat, destLng, profile, stage, orderId
 */
const getRoute = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, profile = 'bike', stage = 'TO_CUSTOMER', orderId } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        message: 'originLat, originLng, destLat, and destLng are required query parameters'
      });
    }

    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinate values' });
    }

    const routeData = await routingService.calculateRoute({
      origin: [oLat, oLng],
      destination: [dLat, dLng],
      profile: profile || 'bike',
      stage,
      orderId: orderId || null
    });

    return res.json(routeData);
  } catch (err) {
    console.error('getRoute error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Snap single GPS coordinate to road
 * Body: { lat, lng }
 */
const snapCoordinate = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }

    const snapped = await routingService.snapToRoad({ lat: parseFloat(lat), lng: parseFloat(lng) });
    return res.json({ success: true, snapped });
  } catch (err) {
    console.error('snapCoordinate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get active route for an order based on current delivery stage
 * GET /api/routing/order-route/:orderId
 */
const getOrderActiveRoute = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    // Lookup order with Delivery, Vendor, and Address
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: String(orderId) },
          { orderNumber: String(orderId) },
          { Delivery: { id: String(orderId) } }
        ]
      },
      include: {
        Vendor: true,
        Address: true,
        Delivery: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Determine delivery stage
    const isHeadingToPickup = ['ASSIGNED', 'PREPARING', 'READY_FOR_PICKUP', 'WAITING_PICKUP', 'ARRIVED_AT_PICKUP'].includes(order.status) ||
      ['ASSIGNED', 'WAITING_PICKUP'].includes(order.Delivery?.status);

    const stage = isHeadingToPickup ? 'TO_PICKUP' : 'TO_CUSTOMER';

    // Check existing active route in cache
    const cachedRoute = routingService.getActiveRoute(order.id);
    if (cachedRoute && cachedRoute.stage === stage) {
      return res.json({
        success: true,
        cached: true,
        stage,
        ...cachedRoute
      });
    }

    // Resolve Origin and Destination
    const vendorLat = order.Vendor?.latitude ? Number(order.Vendor.latitude) : (order.Delivery?.pickupLat ? Number(order.Delivery.pickupLat) : 28.57);
    const vendorLng = order.Vendor?.longitude ? Number(order.Vendor.longitude) : (order.Delivery?.pickupLng ? Number(order.Delivery.pickupLng) : 77.32);

    const customerLat = order.Address?.latitude ? Number(order.Address.latitude) : (order.Delivery?.dropLat ? Number(order.Delivery.dropLat) : vendorLat + 0.02);
    const customerLng = order.Address?.longitude ? Number(order.Address.longitude) : (order.Delivery?.dropLng ? Number(order.Delivery.dropLng) : vendorLng + 0.02);

    let originLat = null;
    let originLng = null;
    let destLat = null;
    let destLng = null;

    if (stage === 'TO_PICKUP') {
      // Driver -> Vendor Store
      originLat = order.Delivery?.currentLat ? Number(order.Delivery.currentLat) : (vendorLat - 0.015);
      originLng = order.Delivery?.currentLng ? Number(order.Delivery.currentLng) : (vendorLng - 0.015);
      destLat = vendorLat;
      destLng = vendorLng;
    } else {
      // Driver -> Customer
      originLat = order.Delivery?.currentLat ? Number(order.Delivery.currentLat) : vendorLat;
      originLng = order.Delivery?.currentLng ? Number(order.Delivery.currentLng) : vendorLng;
      destLat = customerLat;
      destLng = customerLng;
    }

    const routeData = await routingService.calculateBikeRoute({
      origin: [originLat, originLng],
      destination: [destLat, destLng],
      stage,
      orderId: order.id
    });

    return res.json({
      success: true,
      stage,
      ...routeData
    });
  } catch (err) {
    console.error('getOrderActiveRoute error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRoute,
  snapCoordinate,
  getOrderActiveRoute
};
