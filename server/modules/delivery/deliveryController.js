const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');
const { getIO, calculateDistance } = require('../../socket/socketHandler');
const {
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinAttempts,
  validateDropoffGeofence
} = require('../../utils/deliveryVerification');
const { acceptOffer, rejectOffer } = require('../../services/dispatchService');

const { calculateDeliveryPayout } = require('../../utils/payoutCalculator');

// Helper to format delivery object for frontend
const formatDeliveryObj = (d) => {
  if (!d) return null;
  const ord = d.Order || null;
  const vendorObj = ord?.Vendor || null;
  const addressObj = ord?.Address || null;
  const customerObj = ord?.User_Order_customerIdToUser || null;

  const pickupLat = d.pickupLat ? Number(d.pickupLat) : (vendorObj?.latitude ? Number(vendorObj.latitude) : null);
  const pickupLng = d.pickupLng ? Number(d.pickupLng) : (vendorObj?.longitude ? Number(vendorObj.longitude) : null);
  const dropLat = d.dropLat ? Number(d.dropLat) : (ord?.dropLat ? Number(ord.dropLat) : (addressObj?.latitude ? Number(addressObj.latitude) : null));
  const dropLng = d.dropLng ? Number(d.dropLng) : (ord?.dropLng ? Number(ord.dropLng) : (addressObj?.longitude ? Number(addressObj.longitude) : null));

  // Compute exact distance from vendor shop location to user deliverable address
  const realDistance = (pickupLat !== null && pickupLng !== null && dropLat !== null && dropLng !== null)
    ? calculateDistance(pickupLat, pickupLng, dropLat, dropLng)
    : null;

  const distKm = (realDistance !== null && realDistance > 0) ? realDistance : Number(d.distanceKm || 3.4);
  const computedEarnings = calculateDeliveryPayout(distKm);
  const earningsVal = (d.earnings && Number(d.earnings) > 0) ? Number(d.earnings) : computedEarnings;

  const placedTime = ord?.placedAt ? new Date(ord.placedAt) : new Date(d.createdAt);
  const estDeliveryMinutes = Math.round(15 + distKm * 4);
  const estDeliveryAt = new Date(placedTime.getTime() + (estDeliveryMinutes + 15) * 60000);
  const customerLocName = addressObj
    ? [addressObj.addressLine, addressObj.city].filter(Boolean).join(', ')
    : (customerObj?.fullName ? `${customerObj.fullName}'s Location` : 'Customer Address');

  return {
    _id: d.id,
    id: d.id,
    orderId: d.orderId,
    orderNumber: ord?.orderNumber || d.orderId,
    deliveryPartnerId: d.deliveryPartnerId,
    status: d.status,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    currentLat: d.currentLat ? Number(d.currentLat) : null,
    currentLng: d.currentLng ? Number(d.currentLng) : null,
    earnings: earningsVal,
    distanceKm: distKm,
    tripDistanceKm: distKm,
    predictedPayout: earningsVal,
    estimatedMinutes: estDeliveryMinutes,
    predictedDeliveryMinutes: estDeliveryMinutes,
    estimatedCompletionTime: estDeliveryAt.toISOString(),
    placedAt: ord?.placedAt || d.createdAt,
    vendorReceivedAt: ord?.placedAt || d.createdAt,
    customerLocationName: customerLocName,
    pickupAt: d.pickupAt,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
    restaurant: vendorObj ? {
      _id: vendorObj.id,
      id: vendorObj.id,
      name: vendorObj.name,
      address: vendorObj.address,
      city: vendorObj.city,
      phone: vendorObj.phone,
      latitude: pickupLat,
      longitude: pickupLng,
      lat: pickupLat,
      lng: pickupLng,
      image: vendorObj.image,
      vendorType: vendorObj.vendorType
    } : null,
    restaurantId: vendorObj ? {
      _id: vendorObj.id,
      id: vendorObj.id,
      name: vendorObj.name,
      address: vendorObj.address,
      city: vendorObj.city,
      phone: vendorObj.phone,
      latitude: pickupLat,
      longitude: pickupLng,
      lat: pickupLat,
      lng: pickupLng
    } : null,
    customerAddress: addressObj ? {
      addressLine: addressObj.addressLine,
      street: addressObj.addressLine,
      city: addressObj.city,
      pincode: addressObj.pincode,
      latitude: dropLat,
      longitude: dropLng,
      lat: dropLat,
      lng: dropLng
    } : null,
    address: addressObj ? {
      addressLine: addressObj.addressLine,
      street: addressObj.addressLine,
      city: addressObj.city,
      pincode: addressObj.pincode,
      latitude: dropLat,
      longitude: dropLng,
      lat: dropLat,
      lng: dropLng
    } : null,
    customer: customerObj ? {
      _id: customerObj.id,
      id: customerObj.id,
      name: customerObj.fullName || customerObj.name || 'Customer',
      phone: customerObj.phone,
      avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
    } : null,
    customerId: customerObj ? {
      _id: customerObj.id,
      id: customerObj.id,
      name: customerObj.fullName || customerObj.name || 'Customer',
      phone: customerObj.phone,
      avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
    } : null,
    order: ord ? {
      _id: ord.id,
      id: ord.id,
      orderNumber: ord.orderNumber,
      totalAmount: Number(ord.totalAmount),
      status: ord.status,
      orderType: ord.orderType
      // deliveryPin is intentionally omitted to prevent driver bypass
    } : null,
    items: ord?.OrderItem?.map(it => ({
      name: it.name,
      quantity: it.quantity,
      selectedWeight: it.selectedWeight,
      price: Number(it.unitPrice)
    })) || []
  };
};

const getDeliveryDashboard = async (req, res, next) => {
  try {
    // 1. Find the active delivery assigned to this driver
    const rawActive = await prisma.delivery.findFirst({
      where: {
        deliveryPartnerId: req.user.id,
        status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            OrderItem: true,
            User_Order_customerIdToUser: { select: { id: true, fullName: true, phone: true, avatar: true } }
          }
        }
      }
    });

    const activeDelivery = formatDeliveryObj(rawActive);

    // 2. Find completed past trips
    const rawPast = await prisma.delivery.findMany({
      where: {
        deliveryPartnerId: req.user.id,
        status: 'DELIVERED'
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            User_Order_customerIdToUser: { select: { id: true, fullName: true, phone: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const pastDeliveries = rawPast.map(formatDeliveryObj);
    const totalEarnings = pastDeliveries.reduce((sum, d) => sum + (d.earnings || 65), 0);

    // 3. Find active pending DeliveryOffer for this specific rider
    const pendingOffer = await prisma.deliveryOffer.findFirst({
      where: {
        riderId: req.user.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            OrderItem: true,
            User_Order_customerIdToUser: { select: { id: true, fullName: true, phone: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let activeOfferData = null;
    if (pendingOffer && pendingOffer.Order) {
      const ord = pendingOffer.Order;
      const v = ord.Vendor;
      const a = ord.Address;
      const remainingSecs = Math.max(0, Math.round((new Date(pendingOffer.expiresAt).getTime() - Date.now()) / 1000));
      const pickupLat = ord.pickupLat ? Number(ord.pickupLat) : (v?.latitude ? Number(v.latitude) : 28.4866);
      const pickupLng = ord.pickupLng ? Number(ord.pickupLng) : (v?.longitude ? Number(v.longitude) : 77.2918);
      const dropLat = ord.dropLat ? Number(ord.dropLat) : (a?.latitude ? Number(a.latitude) : pickupLat);
      const dropLng = ord.dropLng ? Number(ord.dropLng) : (a?.longitude ? Number(a.longitude) : pickupLng);
      const tripDist = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
      const customerLocName = a
        ? [a.addressLine, a.city].filter(Boolean).join(', ')
        : (ord.User_Order_customerIdToUser?.fullName ? `${ord.User_Order_customerIdToUser.fullName}'s Location` : 'Customer Address');

      activeOfferData = {
        offerId: pendingOffer.id,
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        orderType: ord.orderType,
        totalAmount: Number(ord.totalAmount),
        restaurantName: v?.name || 'Local Store',
        restaurantAddress: v?.address || 'Pickup Point',
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        pickupDistanceKm: Number(pendingOffer.distanceToShop || 1.2),
        customerDistanceKm: tripDist,
        payout: Number(pendingOffer.payout),
        customerAddress: customerLocName,
        customerLocationName: customerLocName,
        customerName: ord.User_Order_customerIdToUser?.fullName || 'Customer',
        customerPhone: ord.User_Order_customerIdToUser?.phone || '',
        expiresAt: pendingOffer.expiresAt.toISOString(),
        expiresInSeconds: remainingSecs
      };
    }

    res.json({
      success: true,
      activeOffer: activeOfferData,
      activeDelivery,
      availableJobs: activeOfferData ? [activeOfferData] : [],
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
    const { status, deliveryPin } = req.body; // e.g. PICKED_UP, OUT_FOR_DELIVERY, DELIVERED

    const delivery = await prisma.delivery.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id }
        ]
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            User_Order_customerIdToUser: true
          }
        }
      }
    });

    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.deliveryPartnerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized for this delivery' });
    }

    if (delivery.status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'This delivery trip has already been completed.' });
    }

    // Enforce valid delivery state machine
    const validDeliveryTransitions = {
      'ASSIGNED': ['WAITING_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_CUSTOMER', 'DELIVERED'],
      'WAITING_PICKUP': ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_CUSTOMER', 'DELIVERED'],
      'ARRIVED_AT_PICKUP': ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_CUSTOMER', 'DELIVERED'],
      'PICKED_UP': ['OUT_FOR_DELIVERY', 'ARRIVED_AT_CUSTOMER', 'DELIVERED'],
      'OUT_FOR_DELIVERY': ['ARRIVED_AT_CUSTOMER', 'DELIVERED'],
      'ARRIVED_AT_CUSTOMER': ['DELIVERED']
    };

    const currentDeliveryStatus = delivery.status || 'ASSIGNED';
    const allowedNext = validDeliveryTransitions[currentDeliveryStatus] || [];
    if (!allowedNext.includes(status) && req.user.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery status transition from ${currentDeliveryStatus} to ${status}`
      });
    }

    // 4-Digit PIN verification & Geofencing for completion
    if (status === 'DELIVERED') {
      const orderId = delivery.orderId;

      // 1. PIN Rate Limit Check (3 failed attempts -> 2 min lockout)
      const rateLimitStatus = checkPinRateLimit(orderId);
      if (!rateLimitStatus.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimitStatus.message,
          locked: true,
          remainingSeconds: rateLimitStatus.remainingSeconds
        });
      }

      // 2. Geofence Proximity Check (Use ONLY server-stored rider GPS)
      const riderLat = delivery.currentLat ? Number(delivery.currentLat) : null;
      const riderLng = delivery.currentLng ? Number(delivery.currentLng) : null;
      const dropLat = delivery.dropLat ? Number(delivery.dropLat) : (delivery.Order?.Address?.latitude ? Number(delivery.Order.Address.latitude) : null);
      const dropLng = delivery.dropLng ? Number(delivery.dropLng) : (delivery.Order?.Address?.longitude ? Number(delivery.Order.Address.longitude) : null);

      if (riderLat === null || riderLng === null || isNaN(riderLat) || isNaN(riderLng)) {
        return res.status(400).json({
          success: false,
          message: 'Rider GPS position is unavailable. Please enable live GPS location on your rider device.'
        });
      }

      if (dropLat === null || dropLng === null || isNaN(dropLat) || isNaN(dropLng)) {
        return res.status(400).json({
          success: false,
          message: 'Customer dropoff GPS location is missing for this order. Cannot verify delivery geofence.'
        });
      }

      const geoCheck = validateDropoffGeofence(riderLat, riderLng, dropLat, dropLng, 350);
      if (!geoCheck.valid) {
        return res.status(400).json({
          success: false,
          message: geoCheck.message,
          distanceMeters: geoCheck.distanceMeters,
          maxAllowedMeters: 350
        });
      }

      // 3. Expected vs Entered PIN Check (No hardcoded 1234 fallback!)
      const expectedPin = String(delivery.Order?.deliveryPin || '').trim();
      const enteredPin = String(deliveryPin || '').trim();
      if (!expectedPin) {
        return res.status(400).json({ success: false, message: 'Delivery PIN was not generated for this order. Contact support.' });
      }
      if (!enteredPin || enteredPin !== expectedPin) {
        const attemptResult = recordFailedPinAttempt(orderId);
        if (attemptResult.locked) {
          return res.status(429).json({
            success: false,
            message: attemptResult.message,
            locked: true,
            remainingSeconds: attemptResult.remainingSeconds
          });
        }
        return res.status(400).json({
          success: false,
          message: attemptResult.message,
          attemptsRemaining: attemptResult.attemptsRemaining
        });
      }

      // Clear any failed attempts upon success
      clearPinAttempts(orderId);
    }

    let orderStatus = delivery.Order.status;
    let deliveryStatus = delivery.status;
    let timelineNote = `Delivery status updated to ${status}`;

    if (status === 'ARRIVED_AT_PICKUP') {
      deliveryStatus = 'WAITING_PICKUP';
      orderStatus = delivery.Order.status;
      timelineNote = 'Rider arrived at restaurant for pickup';
    } else if (status === 'PICKED_UP') {
      deliveryStatus = 'PICKED_UP';
      orderStatus = 'PICKED_UP';
      timelineNote = 'Order picked up from store';
    } else if (status === 'OUT_FOR_DELIVERY') {
      deliveryStatus = 'OUT_FOR_DELIVERY';
      orderStatus = 'OUT_FOR_DELIVERY';
      timelineNote = 'Rider out for delivery to customer';
    } else if (status === 'ARRIVED_AT_CUSTOMER') {
      deliveryStatus = 'OUT_FOR_DELIVERY';
      orderStatus = 'OUT_FOR_DELIVERY';
      timelineNote = 'Rider arrived at customer delivery location';
    } else if (status === 'DELIVERED') {
      deliveryStatus = 'DELIVERED';
      orderStatus = 'DELIVERED';
      timelineNote = 'Order delivered successfully. Verified with 4-digit PIN.';
    }

    const now = new Date();
    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: deliveryStatus,
        pickupAt: (status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') ? (delivery.pickupAt || now) : delivery.pickupAt,
        deliveredAt: status === 'DELIVERED' ? now : delivery.deliveredAt
      },
      include: {
        Order: {
          include: {
            Vendor: true,
            Address: true,
            OrderItem: true,
            User_Order_customerIdToUser: true
          }
        }
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
            note: timelineNote
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

    // Socket notification to customer, vendor & driver rooms
    try {
      const io = getIO();
      const statusPayload = {
        orderId: delivery.orderId,
        orderNumber: delivery.Order?.orderNumber,
        status: orderStatus,
        deliveryStatus: status,
        timelineNote,
        deliveryPartner: formatDeliveryObj(updatedDelivery)?.deliveryPartner || null
      };
      io.to(`order_${delivery.orderId}`).emit('order:status_updated', statusPayload);
      if (delivery.Order?.vendorId) {
        io.to(`vendor_${delivery.Order.vendorId}`).emit('order:status_updated', statusPayload);
      }
      if (delivery.deliveryPartnerId) {
        io.to(`driver_${delivery.deliveryPartnerId}`).emit('order:status_updated', statusPayload);
      }
    } catch (e) {
      console.log('Socket emit warning:', e.message);
    }

    res.json({
      success: true,
      delivery: formatDeliveryObj(updatedDelivery),
      message: `Delivery updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

// Accept an offer (POST /api/deliveries/offers/:offerId/accept)
const acceptDeliveryOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const result = await acceptOffer(offerId, req.user.id);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Reject an offer (POST /api/deliveries/offers/:offerId/reject)
const rejectDeliveryOffer = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const { reason } = req.body;
    const result = await rejectOffer(offerId, req.user.id, reason);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Update rider GPS location (POST /api/deliveries/location)
const updateRiderLocation = async (req, res, next) => {
  try {
    const rawLat = req.body.lat ?? req.body.latitude;
    const rawLng = req.body.lng ?? req.body.longitude;
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (rawLat === undefined || rawLng === undefined || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return res.status(400).json({ success: false, message: 'lat and lng (or latitude and longitude) must be valid numeric coordinates' });
    }

    await prisma.riderLocation.upsert({
      where: { riderId: req.user.id },
      update: { latitude: lat, longitude: lng, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), riderId: req.user.id, latitude: lat, longitude: lng }
    });

    const { onlineDrivers } = require('../../socket/socketHandler');
    for (const [sockId, drv] of onlineDrivers.entries()) {
      if (drv.driverId === req.user.id) {
        drv.lat = lat;
        drv.lng = lng;
        drv.lastSeen = Date.now();
      }
    }

    res.json({ success: true, message: 'Location updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDeliveryDashboard,
  toggleOnlineStatus,
  submitDeliveryApplication,
  getMyDeliveryApplication,
  updateDeliveryStatus,
  acceptDeliveryOffer,
  rejectDeliveryOffer,
  updateRiderLocation
};
