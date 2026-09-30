const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { calculateDistance } = require('../socket/socketHandler');
const { calculateDeliveryPayout } = require('../utils/payoutCalculator');

// Active round timers in memory: orderId -> timerId
const activeDispatchTimers = new Map();

/**
 * 3 KM RIDER DISPATCH ALGORITHM
 * 1. Checks shop coordinates (fails gracefully if missing - no fake fallbacks)
 * 2. Finds online, active delivery partners
 * 3. Removes busy riders (already handling an active delivery)
 * 4. Removes riders who already rejected this order
 * 5. Measures Haversine distance: Rider GPS -> Shop <= 3.0 km
 * 6. Sorts by pickup distance ascending
 * 7. Rings only top 3 candidates via private room driver_<id> with 15s expiration
 * 8. Automatic 15s round fallback to next 3 candidates
 */
async function dispatchOrder(orderId) {
  try {
    // Clear any existing timer for this order
    if (activeDispatchTimers.has(orderId)) {
      clearTimeout(activeDispatchTimers.get(orderId));
      activeDispatchTimers.delete(orderId);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Vendor: true,
        Address: true,
        Delivery: true,
        DeliveryOffer: true,
        User_Order_customerIdToUser: true
      }
    });

    if (!order) {
      console.warn(`[Dispatch] Order ${orderId} not found`);
      return { success: false, reason: 'ORDER_NOT_FOUND' };
    }

    // If order is already assigned or completed/cancelled, stop dispatch
    if (order.deliveryPartnerId || order.Delivery?.deliveryPartnerId || ['DELIVERED', 'CANCELLED'].includes(order.status)) {
      console.log(`[Dispatch] Order ${order.orderNumber || orderId} is already assigned/completed`);
      return { success: false, reason: 'ALREADY_ASSIGNED' };
    }

    // Strict Guard: Rider dispatch is allowed ONLY when vendor has confirmed the order (order.status === 'CONFIRMED')
    if (order.status !== 'CONFIRMED') {
      console.log(`[Dispatch] Skipping dispatch for Order ${order.orderNumber || orderId}: status is "${order.status}" (must be CONFIRMED)`);
      return { success: false, reason: 'ORDER_NOT_CONFIRMED' };
    }

    // Step 1: Validate shop coordinates (No fake fallbacks!)
    const shopLat = order.pickupLat ? Number(order.pickupLat) : (order.Vendor?.latitude ? Number(order.Vendor.latitude) : null);
    const shopLng = order.pickupLng ? Number(order.pickupLng) : (order.Vendor?.longitude ? Number(order.Vendor.longitude) : null);

    if (shopLat === null || shopLng === null || isNaN(shopLat) || isNaN(shopLng)) {
      console.warn(`[Dispatch] Order ${order.orderNumber} cannot enter auto-dispatch: Shop coordinates missing`);
      return { success: false, reason: 'SHOP_COORDINATES_MISSING' };
    }

    // Validate dropoff coordinates (No fake distance fallbacks!)
    const dropLat = order.dropLat ? Number(order.dropLat) : (order.Address?.latitude ? Number(order.Address.latitude) : null);
    const dropLng = order.dropLng ? Number(order.dropLng) : (order.Address?.longitude ? Number(order.Address.longitude) : null);

    if (dropLat === null || dropLng === null || isNaN(dropLat) || isNaN(dropLng)) {
      console.warn(`[Dispatch] Order ${order.orderNumber} cannot enter auto-dispatch: Dropoff coordinates missing`);
      return { success: false, reason: 'DROPOFF_COORDINATES_MISSING' };
    }

    const tripDistanceKm = calculateDistance(shopLat, shopLng, dropLat, dropLng);
    const payout = calculateDeliveryPayout(tripDistanceKm);

    // Step 2: Query candidate delivery partners who are ONLINE and ACTIVE
    const onlineRiders = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_PARTNER',
        isOnline: true,
        status: 'active'
      },
      include: {
        RiderLocation: true
      }
    });

    if (onlineRiders.length === 0) {
      console.log(`[Dispatch] No online delivery partners found`);
      notifyNoRidersAvailable(order, 'No online delivery partners currently available');
      return { success: false, reason: 'NO_ONLINE_RIDERS' };
    }

    // Step 3: Remove busy riders who already have an active assigned delivery
    const busyDeliveries = await prisma.delivery.findMany({
      where: {
        status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
      },
      select: { deliveryPartnerId: true }
    });
    const busyRiderIds = new Set(busyDeliveries.map(d => d.deliveryPartnerId));

    // Step 4: Exclude riders who explicitly REJECTED this order or currently have an active PENDING offer
    const alreadyOfferedRiderIds = new Set(
      (order.DeliveryOffer || [])
        .filter(o => o.status === 'REJECTED' || (o.status === 'PENDING' && o.expiresAt && new Date(o.expiresAt) > new Date()))
        .map(o => o.riderId)
    );

    // Step 5: Check freshness & distance from Rider to Shop (Tiered 3.0 km -> 10.0 km radius)
    const now = Date.now();
    const GPS_FRESHNESS_MS = 30 * 60 * 1000; // 30 minutes freshness window for online drivers
    let candidatePool = [];

    const { onlineDrivers } = require('../socket/socketHandler');

    // Collect all online candidate riders with their coordinates
    const evaluatedRiders = [];
    for (const rider of onlineRiders) {
      if (busyRiderIds.has(rider.id)) continue;
      if (alreadyOfferedRiderIds.has(rider.id)) continue;

      // Look up rider location from live socket memory or database RiderLocation
      let riderLat = null;
      let riderLng = null;
      let lastUpdated = 0;

      // Check live socket drivers map first
      for (const [sockId, drv] of onlineDrivers.entries()) {
        if (drv.driverId === rider.id && drv.lat && drv.lng) {
          riderLat = drv.lat;
          riderLng = drv.lng;
          lastUpdated = drv.lastSeen || now;
          break;
        }
      }

      // Fallback to persisted RiderLocation
      if (riderLat === null && rider.RiderLocation?.latitude && rider.RiderLocation?.longitude) {
        riderLat = Number(rider.RiderLocation.latitude);
        riderLng = Number(rider.RiderLocation.longitude);
        lastUpdated = new Date(rider.RiderLocation.updatedAt).getTime();
      }

      if (riderLat === null || riderLng === null) {
        // Rider has not provided GPS yet
        continue;
      }

      // Check GPS freshness: within last 30 minutes for online riders
      if (now - lastUpdated > GPS_FRESHNESS_MS) {
        continue; // Truly stale GPS (> 30 mins)
      }

      // Calculate Haversine distance Rider -> Shop
      const distanceToShop = calculateDistance(riderLat, riderLng, shopLat, shopLng);

      evaluatedRiders.push({
        id: rider.id,
        fullName: rider.fullName,
        phone: rider.phone,
        distanceToShop,
        riderLat,
        riderLng
      });
    }

    // Tier 1: Look for riders within 3.0 km radius
    candidatePool = evaluatedRiders.filter(r => r.distanceToShop <= 3.0);

    // Tier 2: If none within 3 km, expand radius up to 10.0 km so nearby riders receive the order
    if (candidatePool.length === 0) {
      candidatePool = evaluatedRiders.filter(r => r.distanceToShop <= 10.0);
      if (candidatePool.length > 0) {
        console.log(`[Dispatch] Expanded radius to 10 km: found ${candidatePool.length} candidate(s) for ${order.Vendor?.name}`);
      }
    }

    if (candidatePool.length === 0) {
      const maxRadius = evaluatedRiders.length > 0 ? '10' : '3';
      console.log(`[Dispatch] No available delivery partners within ${maxRadius} km of ${order.Vendor?.name} (${evaluatedRiders.length} total evaluated)`);
      notifyNoRidersAvailable(order, `No available delivery partners within ${maxRadius} km delivery radius`);
      return { success: false, reason: 'NO_RIDERS_WITHIN_RANGE' };
    }

    // Step 6: Rank candidates by pickup distance (shortest distance to shop first)
    candidatePool.sort((a, b) => a.distanceToShop - b.distanceToShop);

    // Step 7: Select top 3 nearest riders for this round
    const roundCandidates = candidatePool.slice(0, 3);
    const actualRadius = candidatePool[candidatePool.length - 1]?.distanceToShop?.toFixed(1) || '3.0';
    console.log(`[Dispatch] Ringing ${roundCandidates.length} nearest riders within ${actualRadius} km for Order #${order.orderNumber}:`,
      roundCandidates.map(c => `${c.fullName} (${c.distanceToShop.toFixed(1)} km)`).join(', ')
    );

    const { getIO } = require('../socket/socketHandler');
    let io;
    try {
      io = getIO();
    } catch {
      io = null;
    }

    const expiresAt = new Date(Date.now() + 15000); // 15 seconds validity
    const createdOfferIds = [];

    const customerAddressStr = order.Address
      ? [order.Address.addressLine, order.Address.city].filter(Boolean).join(', ')
      : (order.User_Order_customerIdToUser?.fullName ? `${order.User_Order_customerIdToUser.fullName}'s Location` : 'Customer Address');

    for (const candidate of roundCandidates) {
      const offerId = crypto.randomUUID();
      createdOfferIds.push(offerId);

      // Persist DeliveryOffer in PostgreSQL
      await prisma.deliveryOffer.create({
        data: {
          id: offerId,
          orderId: order.id,
          riderId: candidate.id,
          status: 'PENDING',
          offeredAt: new Date(),
          expiresAt,
          distanceToShop: candidate.distanceToShop,
          estimatedPickupMinutes: Math.max(3, Math.round(candidate.distanceToShop * 3.5)),
          payout
        }
      });

      if (io) {
        const offerPayload = {
          offerId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantName: order.Vendor?.name || 'Store',
          restaurantAddress: order.Vendor?.address || 'Pickup Point',
          pickupLat: shopLat,
          pickupLng: shopLng,
          dropLat,
          dropLng,
          customerAddress: customerAddressStr,
          customerLocationName: customerAddressStr,
          customerName: order.User_Order_customerIdToUser?.fullName || 'Customer',
          customerPhone: order.User_Order_customerIdToUser?.phone || '',
          pickupDistanceKm: candidate.distanceToShop,
          customerDistanceKm: tripDistanceKm,
          payout,
          expiresAt: expiresAt.toISOString(),
          expiresInSeconds: 15
        };

        io.to(`driver_${candidate.id}`).emit('delivery:new_offer', offerPayload);
        io.to('drivers_pool').emit('delivery:new_job_available', offerPayload);
      }
    }

    // Step 8: 15.5-second timer for this round fallback
    const timerId = setTimeout(async () => {
      activeDispatchTimers.delete(order.id);

      // Check if order was accepted during this 15-second window
      const freshOrder = await prisma.order.findUnique({
        where: { id: order.id },
        select: { deliveryPartnerId: true, status: true }
      });

      if (!freshOrder || freshOrder.deliveryPartnerId || ['DELIVERED', 'CANCELLED'].includes(freshOrder.status)) {
        return; // Order was accepted or finished
      }

      // Mark unresponded offers in this round as EXPIRED
      await prisma.deliveryOffer.updateMany({
        where: {
          id: { in: createdOfferIds },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      });

      // Send offer_cancelled to expired riders so their UI stops ringing
      if (io) {
        for (const candidate of roundCandidates) {
          io.to(`driver_${candidate.id}`).emit('delivery:offer_cancelled', {
            orderId: order.id,
            reason: 'Offer expired (15s timeout)'
          });
        }
      }

      console.log(`[Dispatch] Round 1 expired for Order #${order.orderNumber}. Dispatching to next batch...`);
      // Trigger next round of candidates within 3 km
      dispatchOrder(order.id);
    }, 15500);

    activeDispatchTimers.set(order.id, timerId);

    return {
      success: true,
      offeredToCount: roundCandidates.length,
      candidates: roundCandidates
    };
  } catch (err) {
    console.error('[Dispatch] Error dispatching order:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ATOMIC ACCEPT OFFER (First-Accept-Wins)
 */
async function acceptOffer(offerId, riderId) {
  const offer = await prisma.deliveryOffer.findUnique({
    where: { id: offerId },
    include: {
      Order: {
        include: {
          Vendor: true,
          Address: true,
          User_Order_customerIdToUser: true
        }
      },
      User: true
    }
  });

  if (!offer) {
    return { success: false, statusCode: 404, message: 'Delivery offer not found' };
  }

  if (offer.riderId !== riderId) {
    return { success: false, statusCode: 403, message: 'This offer was not assigned to you' };
  }

  if (offer.status === 'ACCEPTED') {
    return { success: true, message: 'Already accepted', order: offer.Order };
  }

  if (offer.status !== 'PENDING') {
    return { success: false, statusCode: 400, message: `Offer is no longer active (status: ${offer.status})` };
  }

  // Check if rider is currently busy with another active delivery
  const existingActive = await prisma.delivery.findFirst({
    where: {
      deliveryPartnerId: riderId,
      status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
    }
  });

  if (existingActive) {
    return {
      success: false,
      statusCode: 409,
      message: 'You are already handling an active delivery. Complete your current delivery before accepting another.'
    };
  }

  const order = offer.Order;

  // ATOMIC DATABASE CHECK-AND-SET: First-accept-wins!
  const updateResult = await prisma.order.updateMany({
    where: {
      id: order.id,
      deliveryPartnerId: null // Must be unassigned
    },
    data: {
      deliveryPartnerId: riderId
      // Vendor acceptance confirms the order. Rider acceptance assigns rider without resetting order status!
    }
  });

  if (updateResult.count === 0) {
    // Another rider accepted first!
    await prisma.deliveryOffer.update({
      where: { id: offerId },
      data: { status: 'CANCELLED' }
    });
    return {
      success: false,
      statusCode: 409,
      message: 'This delivery has already been accepted by another delivery partner.'
    };
  }

  // Mark this offer ACCEPTED
  await prisma.deliveryOffer.update({
    where: { id: offerId },
    data: {
      status: 'ACCEPTED',
      respondedAt: new Date()
    }
  });

  // Cancel any active dispatch timeout timer
  if (activeDispatchTimers.has(order.id)) {
    clearTimeout(activeDispatchTimers.get(order.id));
    activeDispatchTimers.delete(order.id);
  }

  // Cancel all other pending offers for this order
  const otherOffers = await prisma.deliveryOffer.findMany({
    where: {
      orderId: order.id,
      id: { not: offerId },
      status: 'PENDING'
    }
  });

  if (otherOffers.length > 0) {
    await prisma.deliveryOffer.updateMany({
      where: {
        orderId: order.id,
        id: { not: offerId },
        status: 'PENDING'
      },
      data: { status: 'CANCELLED' }
    });
  }

  // Stop ringing on all other riders' phones immediately
  const { getIO } = require('../socket/socketHandler');
  try {
    const io = getIO();
    for (const o of otherOffers) {
      io.to(`driver_${o.riderId}`).emit('delivery:offer_cancelled', {
        offerId: o.id,
        orderId: order.id,
        reason: 'Accepted by another delivery partner'
      });
    }
  } catch (e) {
    console.warn('[Dispatch] Socket offer_cancelled emit warning:', e.message);
  }

  // Calculate coordinates & distances (Strict real GPS: No fake fallbacks!)
  const shopLat = order.pickupLat ? Number(order.pickupLat) : (order.Vendor?.latitude ? Number(order.Vendor.latitude) : null);
  const shopLng = order.pickupLng ? Number(order.pickupLng) : (order.Vendor?.longitude ? Number(order.Vendor.longitude) : null);
  const dropLat = order.dropLat ? Number(order.dropLat) : (order.Address?.latitude ? Number(order.Address.latitude) : null);
  const dropLng = order.dropLng ? Number(order.dropLng) : (order.Address?.longitude ? Number(order.Address.longitude) : null);

  if (shopLat === null || shopLng === null || dropLat === null || dropLng === null || isNaN(shopLat) || isNaN(shopLng) || isNaN(dropLat) || isNaN(dropLng)) {
    return {
      success: false,
      statusCode: 400,
      message: 'Cannot accept offer: Order pickup or dropoff coordinates are missing.'
    };
  }

  const tripDistanceKm = calculateDistance(shopLat, shopLng, dropLat, dropLng);

  // Upsert Delivery record bound to this driver
  const delivery = await prisma.delivery.upsert({
    where: { orderId: order.id },
    update: {
      deliveryPartnerId: riderId,
      status: 'ASSIGNED',
      pickupLat: shopLat,
      pickupLng: shopLng,
      dropLat,
      dropLng,
      earnings: Number(offer.payout),
      distanceKm: tripDistanceKm,
      estimatedMinutes: Math.max(10, Math.round(tripDistanceKm * 4))
    },
    create: {
      id: crypto.randomUUID(),
      orderId: order.id,
      deliveryPartnerId: riderId,
      status: 'ASSIGNED',
      pickupLat: shopLat,
      pickupLng: shopLng,
      dropLat,
      dropLng,
      earnings: Number(offer.payout),
      distanceKm: tripDistanceKm,
      estimatedMinutes: Math.max(10, Math.round(tripDistanceKm * 4))
    }
  });

  // Append OrderTimeline
  await prisma.orderTimeline.create({
    data: {
      id: crypto.randomUUID(),
      orderId: order.id,
      status: 'ASSIGNED',
      note: `Delivery partner ${offer.User?.fullName || 'Driver'} accepted order.`
    }
  });

  // Notify customer & tracking rooms that driver has been assigned
  try {
    const io = getIO();
    io.to(`order_${order.id}`).emit('order:driver_assigned', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryPartner: {
        id: offer.User.id,
        name: offer.User.fullName,
        phone: offer.User.phone,
        vehicleType: offer.User.vehicleType || 'Bike',
        ratings: offer.User.ratings || 4.9,
        avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
      }
    });
    io.to(`order_${order.id}`).emit('order:status_updated', {
      orderId: order.id,
      status: 'CONFIRMED',
      deliveryStatus: 'ASSIGNED',
      timelineNote: `Delivery partner ${offer.User.fullName} assigned for pickup.`
    });
  } catch (e) {
    console.warn('[Dispatch] Socket driver_assigned emit warning:', e.message);
  }

  return {
    success: true,
    statusCode: 200,
    delivery,
    message: 'Delivery offer accepted successfully!'
  };
}

/**
 * REJECT OFFER (Persisted in PostgreSQL)
 */
async function rejectOffer(offerId, riderId, reason = 'Rider declined offer') {
  const offer = await prisma.deliveryOffer.findUnique({
    where: { id: offerId }
  });

  if (!offer) {
    return { success: false, statusCode: 404, message: 'Offer not found' };
  }

  if (offer.riderId !== riderId) {
    return { success: false, statusCode: 403, message: 'Not authorized for this offer' };
  }

  await prisma.deliveryOffer.update({
    where: { id: offerId },
    data: {
      status: 'REJECTED',
      respondedAt: new Date()
    }
  });

  // Check if all pending offers in the current round were rejected
  const remainingPending = await prisma.deliveryOffer.count({
    where: {
      orderId: offer.orderId,
      status: 'PENDING'
    }
  });

  // If all riders in this round have rejected, immediately trigger the next round
  if (remainingPending === 0) {
    console.log(`[Dispatch] All riders in round rejected Order ${offer.orderId}. Triggering next round immediately...`);
    dispatchOrder(offer.orderId);
  }

  return { success: true, message: 'Offer rejected' };
}

function notifyNoRidersAvailable(order, message) {
  const { getIO } = require('../socket/socketHandler');
  try {
    const io = getIO();
    // Notify vendor
    if (order.vendorId) {
      io.to(`vendor_${order.vendorId}`).emit('delivery:no_riders_available', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        message
      });
    }
    // Notify admin
    io.to('admin_room').emit('delivery:no_riders_available', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      vendorName: order.Vendor?.name,
      message
    });
  } catch (e) {
    console.warn('[Dispatch] Socket notify warning:', e.message);
  }
}

module.exports = {
  dispatchOrder,
  acceptOffer,
  rejectOffer
};
