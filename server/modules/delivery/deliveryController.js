const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');
const { getIO, calculateDistance } = require('../../socket/socketHandler');

// Helper to format delivery object for frontend
const formatDeliveryObj = (d) => {
  if (!d) return null;
  const ord = d.Order || null;
  const vendorObj = ord?.Vendor || null;
  const addressObj = ord?.Address || null;

  return {
    _id: d.id,
    id: d.id,
    orderId: d.orderId,
    orderNumber: ord?.orderNumber || d.orderId,
    deliveryPartnerId: d.deliveryPartnerId,
    status: d.status,
    pickupLat: d.pickupLat ? Number(d.pickupLat) : (vendorObj?.latitude ? Number(vendorObj.latitude) : 28.5700),
    pickupLng: d.pickupLng ? Number(d.pickupLng) : (vendorObj?.longitude ? Number(vendorObj.longitude) : 77.3200),
    dropLat: d.dropLat ? Number(d.dropLat) : (addressObj?.latitude ? Number(addressObj.latitude) : 28.5355),
    dropLng: d.dropLng ? Number(d.dropLng) : (addressObj?.longitude ? Number(addressObj.longitude) : 77.3910),
    currentLat: d.currentLat ? Number(d.currentLat) : null,
    currentLng: d.currentLng ? Number(d.currentLng) : null,
    earnings: Number(d.earnings || 65),
    distanceKm: Number(d.distanceKm || 3.4),
    estimatedMinutes: d.estimatedMinutes || 20,
    pickupAt: d.pickupAt,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
    restaurant: vendorObj ? {
      _id: vendorObj.id,
      id: vendorObj.id,
      name: vendorObj.name,
      address: vendorObj.address,
      city: vendorObj.city,
      phone: vendorObj.phone
    } : null,
    customerAddress: addressObj ? {
      addressLine: addressObj.addressLine,
      city: addressObj.city,
      pincode: addressObj.pincode
    } : null,
    order: ord ? {
      _id: ord.id,
      id: ord.id,
      orderNumber: ord.orderNumber,
      totalAmount: Number(ord.totalAmount),
      status: ord.status,
      orderType: ord.orderType
    } : null
  };
};

const getDeliveryDashboard = async (req, res, next) => {
  try {
    const rawActive = await prisma.delivery.findFirst({
      where: {
        deliveryPartnerId: req.user.id,
        status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            OrderItem: true
          }
        }
      }
    });

    const activeDelivery = formatDeliveryObj(rawActive);

    const rawPast = await prisma.delivery.findMany({
      where: {
        deliveryPartnerId: req.user.id,
        status: 'DELIVERED'
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pastDeliveries = rawPast.map(formatDeliveryObj);
    const totalEarnings = pastDeliveries.reduce((sum, d) => sum + (d.earnings || 65), 0);

    res.json({
      success: true,
      activeDelivery,
      pastDeliveries,
      totalEarnings,
      completedCount: pastDeliveries.length
    });
  } catch (err) {
    next(err);
  }
};

const toggleOnlineStatus = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { isOnline: !user.isOnline }
    });

    res.json({ success: true, isOnline: updated.isOnline });
  } catch (err) {
    next(err);
  }
};

const submitDeliveryApplication = async (req, res, next) => {
  try {
    const { fullName, phone, email, address, vehicleType, vehicleNumber, dlNumber, bankDetails, documents } = req.body;

    const existingApp = await prisma.deliveryPartnerApplication.findFirst({
      where: { userId: req.user.id, status: 'PENDING' }
    });

    if (existingApp) {
      return res.status(400).json({ success: false, message: 'You already have a pending delivery application under review' });
    }

    const app = await prisma.deliveryPartnerApplication.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user.id,
        fullName: fullName || req.user.fullName,
        phone: phone || req.user.phone,
        email: email || req.user.email,
        address: address || 'Noida',
        vehicleType: vehicleType || 'Bike',
        vehicleNumber: vehicleNumber || 'DL 01 EX 1234',
        dlNumber: dlNumber || null,
        bankDetails: bankDetails || null,
        documents: documents || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Delivery application submitted for admin review', application: app });
  } catch (err) {
    next(err);
  }
};

const getMyDeliveryApplication = async (req, res, next) => {
  try {
    const app = await prisma.deliveryPartnerApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, application: app });
  } catch (err) {
    next(err);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. PICKED_UP, OUT_FOR_DELIVERY, DELIVERED

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { Order: true }
    });

    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.deliveryPartnerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized for this delivery' });
    }

    let orderStatus = delivery.Order.status;
    if (status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') {
      orderStatus = 'OUT_FOR_DELIVERY';
    } else if (status === 'DELIVERED') {
      orderStatus = 'DELIVERED';
    }

    const now = new Date();
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status,
        pickupAt: status === 'PICKED_UP' ? now : delivery.pickupAt,
        deliveredAt: status === 'DELIVERED' ? now : delivery.deliveredAt
      }
    });

    await prisma.order.update({
      where: { id: delivery.orderId },
      data: {
        status: orderStatus,
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status: orderStatus,
            note: `Delivery partner updated status to ${status}`
          }
        }
      }
    });

    if (status === 'DELIVERED') {
      await prisma.payment.updateMany({
        where: { orderId: delivery.orderId, method: 'COD' },
        data: { status: 'PAID', paidAt: now, collectedBy: req.user.id }
      });
    }

    // Socket notification
    try {
      const io = getIO();
      io.to(`order_${delivery.orderId}`).emit('order:status_updated', {
        orderId: delivery.orderId,
        status: orderStatus
      });
    } catch (e) {
      console.log('Socket emit warning:', e.message);
    }

    res.json({ success: true, delivery: formatDeliveryObj(updatedDelivery), message: `Delivery updated to ${status}` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDeliveryDashboard,
  toggleOnlineStatus,
  submitDeliveryApplication,
  getMyDeliveryApplication,
  updateDeliveryStatus
};
