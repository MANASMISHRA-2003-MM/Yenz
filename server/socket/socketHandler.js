const prisma = require('../utils/prisma');

// Haversine distance formula in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5; // fallback default
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal
}

let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join room for specific order tracking
    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} joined room order_${orderId}`);
    });

    socket.on('leave_order', (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    // Drivers join online room
    socket.on('join_drivers_room', (driverId) => {
      socket.join('drivers_pool');
      socket.join(`driver_${driverId}`);
      console.log(`Driver ${driverId} joined drivers_pool`);
    });

    // Real-time GPS Location Push from Delivery App
    socket.on('driver:update_location', async ({ orderId, lat, lng }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { Vendor: true }
        });

        if (order) {
          const vendorLat = order.Vendor?.latitude ? Number(order.Vendor.latitude) : 28.5700;
          const vendorLng = order.Vendor?.longitude ? Number(order.Vendor.longitude) : 77.3200;
          const customerLat = 28.5355;
          const customerLng = 77.3910;

          const distanceToCustomer = calculateDistance(lat, lng, customerLat, customerLng);

          io.to(`order_${orderId}`).emit('courier:location_update', {
            orderId,
            lat,
            lng,
            distanceToCustomer,
            etaMinutes: Math.max(3, Math.round(distanceToCustomer * 4)),
            statusText: `Driver is ${distanceToCustomer} km away (${Math.max(3, Math.round(distanceToCustomer * 4))} mins)`
          });
        }
      } catch (err) {
        console.error('Socket GPS error:', err.message);
      }
    });

    socket.on('disconnect', () => {
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

module.exports = { initSocket, getIO, calculateDistance };
