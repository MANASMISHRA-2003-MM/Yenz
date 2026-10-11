const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const routingService = require('../services/routingService');

// Haversine distance formula in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2) || (nLat1 === 0 && nLon1 === 0) || (nLat2 === 0 && nLon2 === 0)) return null;

  const R = 6371; // Radius of earth in km
  const dLat = (nLat2 - nLat1) * Math.PI / 180;
  const dLon = (nLon2 - nLon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * Math.PI / 180) * Math.cos(nLat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const km = calculateDistance(lat1, lon1, lat2, lon2);
  return km !== null ? Math.round(km * 1000) : 0;
}

let ioInstance = null;

// Active online drivers pool with coordinates in memory
const onlineDrivers = new Map(); // socketId -> { driverId, lat, lng, lastSeen }

// DB write throttling: orderId -> timestamp & coords
const lastDbPersistTimes = new Map();
const lastPersistCoords = new Map();

const initSocket = (io) => {
  ioInstance = io;

  // 1. Authenticate Socket.IO connection using access token
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;

      if (!token) {
        // Allow unauthenticated guest connections for public browsing,
        // but mark socket as unauthenticated
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'krawing_secret_key_2026');
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, fullName: true, email: true, phone: true, role: true, avatar: true, vehicleType: true, ratings: true }
      });

      if (!user) {
        socket.user = null;
        return next();
      }

      socket.user = user;
      return next();
    } catch (err) {
      console.warn('Socket authentication warning:', err.message);
      socket.user = null;
      return next();
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id} (${socket.user?.fullName || 'Guest'}, role: ${socket.user?.role || 'NONE'})`);

    // In-memory rate limiting map for this socket
    let lastLocationUpdate = 0;

    // AUTO-JOIN: Vendors automatically join their vendor-specific rooms on connection
    if (socket.user && (socket.user.role === 'VENDOR' || socket.user.role === 'vendor')) {
      try {
        const vendorStores = await prisma.vendor.findMany({
          where: { ownerUserId: socket.user.id },
          select: { id: true, name: true }
        });
        for (const store of vendorStores) {
          socket.join(`vendor_${store.id}`);
          console.log(`🏪 Vendor ${socket.user.fullName} auto-joined room vendor_${store.id} (${store.name})`);
        }
      } catch (err) {
        console.warn('Vendor auto-join warning:', err.message);
      }
    }

    // Allow vendor to manually join their vendor room (fallback)
    socket.on('join_vendor_room', async (vendorId) => {
      try {
        if (!socket.user) {
          socket.emit('error:unauthorized', { message: 'Authentication required.' });
          return;
        }
        const role = (socket.user.role || '').toUpperCase();
        if (role !== 'VENDOR' && role !== 'ADMIN') {
          socket.emit('error:forbidden', { message: 'Only vendors can join vendor rooms.' });
          return;
        }
        // Verify this user actually owns this vendor store (unless admin)
        if (role === 'VENDOR') {
          const vendorStore = await prisma.vendor.findFirst({
            where: { id: String(vendorId), ownerUserId: socket.user.id }
          });
          if (!vendorStore) {
            socket.emit('error:forbidden', { message: 'You do not own this vendor store.' });
            return;
          }
        }
        socket.join(`vendor_${vendorId}`);
        console.log(`🏪 Socket ${socket.id} (${socket.user.fullName}) joined vendor_${vendorId}`);
      } catch (err) {
        console.error('join_vendor_room error:', err.message);
      }
    });

    // 2. Allow customers to join only their own order rooms
    socket.on('join_order', async (orderIdentifier) => {
      try {
        if (!orderIdentifier) return;

        // If not authenticated, reject access to private order room
        if (!socket.user) {
          socket.emit('error:unauthorized', { message: 'Authentication required to join order tracking room.' });
          return;
        }

        const order = await prisma.order.findFirst({
          where: {
            OR: [
              { id: String(orderIdentifier) },
              { orderNumber: String(orderIdentifier) }
            ]
          },
          include: {
            Vendor: true,
            Delivery: true
          }
        });

        if (!order) {
          socket.emit('error:not_found', { message: 'Order not found' });
          return;
        }

        // Authorization check: User must be Customer, Vendor owner, Assigned Driver, or Admin
        const role = (socket.user.role || '').toUpperCase();
        const userId = socket.user.id;
        const isCustomer = order.customerId === userId;
        const isVendor = order.Vendor?.ownerUserId === userId;
        const isAssignedDriver = order.Delivery?.deliveryPartnerId === userId || order.deliveryPartnerId === userId || order.vendorUserId === userId;
        const isAdmin = role === 'ADMIN';

        if (!isCustomer && !isVendor && !isAssignedDriver && !isAdmin) {
          console.warn(`⛔ Unauthorized room join attempt by user ${userId} for order ${order.id}`);
          socket.emit('error:forbidden', { message: 'Not authorized to join this order tracking room.' });
          return;
        }

        socket.join(`order_${order.id}`);
        console.log(`✅ Authorized Socket ${socket.id} (${socket.user.fullName}) joined order_${order.id}`);

        // Immediately send active route and latest location to the newly joined client
        const activeRoute = routingService.getActiveRoute(order.id);
        if (activeRoute) {
          socket.emit('courier:route_update', {
            orderId: order.id,
            stage: activeRoute.stage,
            geometry: activeRoute.geometry,
            steps: activeRoute.steps,
            distanceKm: activeRoute.distanceKm,
            etaMinutes: activeRoute.durationMinutes,
            isReroute: false
          });
        }

        if (order.Delivery?.currentLat && order.Delivery?.currentLng) {
          socket.emit('courier:location_update', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            lat: Number(order.Delivery.currentLat),
            lng: Number(order.Delivery.currentLng),
            snappedLat: Number(order.Delivery.currentLat),
            snappedLng: Number(order.Delivery.currentLng),
            stage: activeRoute?.stage || 'TO_CUSTOMER',
            distanceToCustomer: Number(order.Delivery.distanceKm || 1.5),
            distanceToTarget: Number(order.Delivery.distanceKm || 1.5),
            etaMinutes: order.Delivery.estimatedMinutes || 7,
            statusText: `Rider is ${order.Delivery.distanceKm || 1.5} km away (~${order.Delivery.estimatedMinutes || 7} mins)`,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error('join_order error:', err.message);
      }
    });

    socket.on('leave_order', (orderId) => {
      if (orderId) {
        socket.leave(`order_${orderId}`);
      }
    });

    // 3. Drivers join online driver room with optional live GPS coordinates
    socket.on('join_drivers_room', (coords) => {
      if (!socket.user || (socket.user.role !== 'DELIVERY_PARTNER' && socket.user.role !== 'ADMIN')) {
        return;
      }

      socket.join('drivers_pool');
      socket.join(`driver_${socket.user.id}`);

      let lat = null;
      let lng = null;
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        if (coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      onlineDrivers.set(socket.id, {
        driverId: socket.user.id,
        driverName: socket.user.fullName,
        driverPhone: socket.user.phone,
        lat,
        lng,
        lastSeen: Date.now()
      });

      if (lat && lng && socket.user?.id) {
        prisma.riderLocation.upsert({
          where: { riderId: socket.user.id },
          update: { latitude: lat, longitude: lng, updatedAt: new Date() },
          create: { id: crypto.randomUUID(), riderId: socket.user.id, latitude: lat, longitude: lng }
        }).catch(err => console.warn('RiderLocation upsert warning:', err.message));
      }

      console.log(`🛵 Driver ${socket.user.fullName} joined driver_${socket.user.id}. GPS: ${lat && lng ? `${lat}, ${lng}` : 'Pending'}`);
    });

    // Driver updates their standing GPS location while waiting for orders
    socket.on('driver:online_location', ({ lat, lng }) => {
      if (!socket.user || socket.user.role !== 'DELIVERY_PARTNER') return;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return;

      const existing = onlineDrivers.get(socket.id) || {
        driverId: socket.user.id,
        driverName: socket.user.fullName,
        driverPhone: socket.user.phone
      };

      onlineDrivers.set(socket.id, {
        ...existing,
        lat,
        lng,
        lastSeen: Date.now()
      });

      if (socket.user?.id) {
        prisma.riderLocation.upsert({
          where: { riderId: socket.user.id },
          update: { latitude: lat, longitude: lng, updatedAt: new Date() },
          create: { id: crypto.randomUUID(), riderId: socket.user.id, latitude: lat, longitude: lng }
        }).catch(err => console.warn('RiderLocation update warning:', err.message));
      }
    });

    // 4. Secure & Rate-Limited Driver Real-Time GPS Tracking with Routing Engine Integration
    socket.on('driver:update_location', async ({ orderId, lat, lng, heading, speed, accuracy, timestamp }) => {
      try {
        // A. Must be authenticated as DELIVERY_PARTNER
        if (!socket.user || socket.user.role !== 'DELIVERY_PARTNER') {
          socket.emit('error:unauthorized', { message: 'Only authorized delivery partners can update location.' });
          return;
        }

        // B. Rate limit: at most 1 update per 1200ms per socket
        const now = Date.now();
        if (now - lastLocationUpdate < 1200) {
          return; // Skip throttled frame
        }
        lastLocationUpdate = now;

        // C. Validate latitude and longitude ranges and reject invalid coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        if (isNaN(lat) || isNaN(lng)) return;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
        if (lat === 0 && lng === 0) return;

        // Reject readings with poor accuracy if specified (> 120m)
        if (typeof accuracy === 'number' && accuracy > 120) {
          console.warn(`[GPS Filter] Discarded low accuracy (${accuracy}m) ping from driver ${socket.user.fullName}`);
          return;
        }

        // D. Look up order and verify sender is the assigned driver
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

        if (!order) return;

        const isAssigned =
          order.Delivery?.deliveryPartnerId === socket.user.id ||
          order.deliveryPartnerId === socket.user.id ||
          order.vendorUserId === socket.user.id;

        if (!isAssigned) {
          socket.emit('error:forbidden', { message: 'You are not the assigned delivery partner for this order.' });
          return;
        }

        // E. Verify order is in an active delivery state
        const activeOrderStatuses = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
        if (!activeOrderStatuses.includes(order.status)) {
          return; // Ignore location pushes for completed/cancelled orders
        }

        // F. Determine delivery stage & target destination
        const isHeadingToPickup = ['ASSIGNED', 'PREPARING', 'READY_FOR_PICKUP', 'WAITING_PICKUP', 'ARRIVED_AT_PICKUP'].includes(order.status) ||
          ['ASSIGNED', 'WAITING_PICKUP'].includes(order.Delivery?.status);
        const stage = isHeadingToPickup ? 'TO_PICKUP' : 'TO_CUSTOMER';

        const vendorLat = order.Vendor?.latitude ? Number(order.Vendor.latitude) : (order.Delivery?.pickupLat ? Number(order.Delivery.pickupLat) : 28.57);
        const vendorLng = order.Vendor?.longitude ? Number(order.Vendor.longitude) : (order.Delivery?.pickupLng ? Number(order.Delivery.pickupLng) : 77.32);

        const dropLat = order.dropLat ? Number(order.dropLat) : (order.Delivery?.dropLat ? Number(order.Delivery.dropLat) : (order.Address?.latitude ? Number(order.Address.latitude) : null));
        const dropLng = order.dropLng ? Number(order.dropLng) : (order.Delivery?.dropLng ? Number(order.Delivery.dropLng) : (order.Address?.longitude ? Number(order.Address.longitude) : null));

        const targetLat = stage === 'TO_PICKUP' ? vendorLat : (dropLat || vendorLat);
        const targetLng = stage === 'TO_PICKUP' ? vendorLng : (dropLng || vendorLng);

        // G. Active Route & Deviation/Rerouting Check
        let activeRoute = routingService.getActiveRoute(order.id);

        // If no active route cached or stage changed, calculate two-wheeler route
        if (!activeRoute || activeRoute.stage !== stage) {
          try {
            activeRoute = await routingService.calculateBikeRoute({
              origin: [lat, lng],
              destination: [targetLat, targetLng],
              stage,
              orderId: order.id
            });
            // Broadcast initial road route to order room
            io.to(`order_${order.id}`).emit('courier:route_update', {
              orderId: order.id,
              stage,
              geometry: activeRoute.geometry,
              steps: activeRoute.steps,
              distanceKm: activeRoute.distanceKm,
              etaMinutes: activeRoute.durationMinutes,
              isReroute: false
            });
          } catch (rErr) {
            console.warn('[Routing] Failed to calculate initial route:', rErr.message);
          }
        }

        // Check if rider deviated significantly from active route
        let snappedLat = lat;
        let snappedLng = lng;
        let currentRoad = null;
        let nextManeuver = null;
        let distanceToNextManeuver = null;
        let remainingDistanceKm = activeRoute?.distanceKm || (calculateDistance(lat, lng, targetLat, targetLng) || 1.5);
        let remainingEtaMinutes = activeRoute?.durationMinutes || Math.max(2, Math.round(remainingDistanceKm * 3));

        if (activeRoute) {
          const deviation = routingService.checkDeviationAndProgress({
            currentLat: lat,
            currentLng: lng,
            orderId: order.id
          });

          if (deviation.snappedPosition) {
            snappedLat = deviation.snappedPosition[0];
            snappedLng = deviation.snappedPosition[1];
          }

          currentRoad = deviation.currentStep?.road || null;
          nextManeuver = deviation.currentStep?.instruction || null;
          distanceToNextManeuver = deviation.distanceToNextManeuver || null;

          // If rider deviated significantly and cooldown has passed, execute reroute
          if (deviation.shouldReroute) {
            try {
              const newRoute = await routingService.executeReroute({
                currentLat: lat,
                currentLng: lng,
                orderId: order.id
              });
              if (newRoute) {
                activeRoute = newRoute;
                remainingDistanceKm = newRoute.distanceKm;
                remainingEtaMinutes = newRoute.durationMinutes;

                // Broadcast updated route to rider & customer without reloading
                io.to(`order_${order.id}`).emit('courier:route_update', {
                  orderId: order.id,
                  stage,
                  geometry: newRoute.geometry,
                  steps: newRoute.steps,
                  distanceKm: newRoute.distanceKm,
                  etaMinutes: newRoute.durationMinutes,
                  isReroute: true
                });
              }
            } catch (reErr) {
              console.warn('[Routing] Dynamic reroute error:', reErr.message);
            }
          }
        }

        // H. Throttled Database Persistence (every 20s or on moving > 100m)
        const lastPersistTime = lastDbPersistTimes.get(order.id) || 0;
        const lastCoord = lastPersistCoords.get(order.id);
        const distMovedMeters = lastCoord ? haversineDistanceMeters(lat, lng, lastCoord.lat, lastCoord.lng) : Infinity;

        if (now - lastPersistTime >= 20000 || distMovedMeters >= 100) {
          lastDbPersistTimes.set(order.id, now);
          lastPersistCoords.set(order.id, { lat, lng });

          if (order.Delivery) {
            prisma.delivery.update({
              where: { id: order.Delivery.id },
              data: {
                currentLat: lat,
                currentLng: lng,
                distanceKm: remainingDistanceKm,
                estimatedMinutes: remainingEtaMinutes
              }
            }).catch(e => console.warn('Delivery current location update warning:', e.message));

            // Log coordinate history for trail
            prisma.deliveryLocation.create({
              data: {
                id: crypto.randomUUID(),
                deliveryId: order.Delivery.id,
                latitude: lat,
                longitude: lng
              }
            }).catch(e => {});
          }
        }

        // I. Broadcast enriched live location & navigation status to customer and driver
        const statusText = stage === 'TO_PICKUP'
          ? `Rider is on the way to store (~${remainingEtaMinutes} mins)`
          : `Rider is ${remainingDistanceKm} km away (~${remainingEtaMinutes} mins)`;

        io.to(`order_${order.id}`).emit('courier:location_update', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          lat,
          lng,
          snappedLat,
          snappedLng,
          heading: typeof heading === 'number' ? heading : null,
          speed: typeof speed === 'number' ? speed : null,
          accuracy: typeof accuracy === 'number' ? accuracy : null,
          stage,
          distanceToCustomer: remainingDistanceKm,
          distanceToTarget: remainingDistanceKm,
          etaMinutes: remainingEtaMinutes,
          currentRoad,
          nextManeuver,
          distanceToNextManeuver,
          statusText,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('Socket GPS error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      onlineDrivers.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

// Helper to dispatch new delivery request via intelligent 3 km targeted dispatch
const broadcastNewDeliveryJob = (jobDetails) => {
  if (!jobDetails || !jobDetails.orderId) return;
  try {
    const { dispatchOrder } = require('../services/dispatchService');
    dispatchOrder(jobDetails.orderId);
  } catch (err) {
    console.error('[Socket] broadcastNewDeliveryJob dispatch error:', err.message);
  }
};

module.exports = {
  initSocket,
  getIO,
  calculateDistance,
  broadcastNewDeliveryJob,
  onlineDrivers
};
