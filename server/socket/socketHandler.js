const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

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

let ioInstance = null;

// Active online drivers pool with coordinates in memory
const onlineDrivers = new Map(); // socketId -> { driverId, lat, lng, lastSeen }

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

    // 4. Secure & Rate-Limited Driver Real-Time GPS Tracking
    socket.on('driver:update_location', async ({ orderId, lat, lng }) => {
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

        // C. Validate latitude and longitude ranges and reject invalid or stale coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        if (isNaN(lat) || isNaN(lng)) return;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
        if (lat === 0 && lng === 0) return;

        // D. Look up order and verify sender is the assigned driver
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              { id: String(orderId) },
              { orderNumber: String(orderId) }
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

        // F. Calculate live ETA and distance to customer dropoff
        const dropLat = order.dropLat ? Number(order.dropLat) : (order.Delivery?.dropLat ? Number(order.Delivery.dropLat) : (order.Address?.latitude ? Number(order.Address.latitude) : null));
        const dropLng = order.dropLng ? Number(order.dropLng) : (order.Delivery?.dropLng ? Number(order.Delivery.dropLng) : (order.Address?.longitude ? Number(order.Address.longitude) : null));

        const distanceToCustomer = (dropLat && dropLng) ? calculateDistance(lat, lng, dropLat, dropLng) : 1.0;
        const etaMinutes = Math.max(2, Math.round(distanceToCustomer * 3));

        // Asynchronously update delivery location in database
        if (order.Delivery) {
          prisma.delivery.update({
            where: { id: order.Delivery.id },
            data: {
              currentLat: lat,
              currentLng: lng,
              distanceKm: distanceToCustomer,
              estimatedMinutes: etaMinutes
            }
          }).catch(e => console.warn('Delivery current location update warning:', e.message));
        }

        // Broadcast to customer and vendor tracking this order
        io.to(`order_${order.id}`).emit('courier:location_update', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          lat,
          lng,
          distanceToCustomer,
          etaMinutes,
          statusText: `Rider is ${distanceToCustomer} km away (~${etaMinutes} mins)`
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
