const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');
const { getIO, calculateDistance } = require('../../socket/socketHandler');

const formatOrderObj = (ord) => {
  if (!ord) return ord;
  const formatted = formatWithId(ord);
  if (formatted.restaurant) {
    formatted.restaurantId = formatted.restaurant;
    formatted.restaurantId.address = {
      street: ord.restaurant?.street || '',
      city: ord.restaurant?.city || '',
      state: ord.restaurant?.state || '',
      pincode: ord.restaurant?.pincode || '',
      lat: ord.restaurant?.lat || 28.5700,
      lng: ord.restaurant?.lng || 77.3200
    };
  }
  if (formatted.customer) {
    formatted.customerId = formatted.customer;
  }
  if (formatted.deliveryPartner) {
    formatted.deliveryPartnerId = formatted.deliveryPartner;
  }
  formatted.address = {
    title: ord.addressTitle || 'Home',
    street: ord.street,
    area: ord.area || '',
    city: ord.city,
    state: ord.state || '',
    pincode: ord.pincode || '',
    phone: ord.phone || '',
    lat: ord.lat || 28.5355,
    lng: ord.lng || 77.3910
  };
  return formatted;
};

exports.createOrder = async (req, res) => {
  try {
    const { address, paymentMethod = 'UPI', deliveryNotes = '' } = req.body;

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        restaurant: true,
        items: {
          include: { food: true }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Basket is empty' });
    }

    const restaurant = cart.restaurant;
    const orderType = restaurant.vendorType === 'FRESH_MARKET' ? 'FRESH' : 'FOOD';

    let subtotal = 0;
    const orderItemsData = cart.items.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        foodId: item.foodId,
        name: item.name,
        price: item.price,
        selectedWeight: item.selectedWeight || null,
        quantity: item.quantity,
        isVeg: item.isVeg
      };
    });

    const deliveryFee = restaurant.deliveryFee || 35;
    const tax = Math.round(subtotal * 0.05);
    const discount = cart.discount || 0;
    const totalAmount = Math.max(0, subtotal + deliveryFee + tax - discount);

    const orderIdCode = `KRAW-${Date.now().toString().slice(-6)}`;

    const createdOrder = await prisma.order.create({
      data: {
        orderId: orderIdCode,
        orderType,
        customerId: req.user.id,
        vendorId: restaurant.vendorId,
        restaurantId: restaurant.id,
        status: 'PLACED',
        street: address?.street || 'Connaught Place',
        area: address?.area || 'Central Delhi',
        city: address?.city || 'New Delhi',
        state: address?.state || 'Delhi',
        pincode: address?.pincode || '110001',
        phone: address?.phone || req.user.phone || '',
        lat: address?.lat ? Number(address.lat) : 28.6139,
        lng: address?.lng ? Number(address.lng) : 77.2090,
        addressTitle: address?.title || 'Home',
        paymentMethod: paymentMethod || 'UPI',
        paymentStatus: 'COMPLETED',
        subtotal,
        deliveryFee,
        tax,
        discount,
        totalAmount,
        deliveryNotes,
        items: {
          create: orderItemsData
        },
        timeline: {
          create: [
            {
              status: 'PLACED',
              timestamp: new Date(),
              note: orderType === 'FRESH' ? 'Fresh Sabzi order placed' : 'Order placed by customer'
            }
          ]
        }
      },
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      }
    });

    // Reset Cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        restaurantId: null,
        couponCode: null,
        discount: 0
      }
    });

    const order = formatOrderObj(createdOrder);

    // Socket.IO Notification to Vendor
    try {
      const io = getIO();
      io.to(`vendor_${restaurant.vendorId}`).emit('order:created', { order });
    } catch (e) {
      console.log('Socket notification warning:', e.message);
    }

    res.status(201).json({
      success: true,
      order,
      message: 'Order created successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    let whereClause = {};
    if (req.user.role === 'consumer') {
      whereClause.customerId = req.user.id;
    } else if (req.user.role === 'vendor') {
      whereClause.vendorId = req.user.id;
    } else if (req.user.role === 'delivery_partner') {
      whereClause.OR = [
        { deliveryPartnerId: req.user.id },
        { status: { in: ['VENDOR_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'] }, deliveryPartnerId: null }
      ];
    }

    if (req.query.orderType) {
      whereClause.orderType = req.query.orderType;
    }

    const rawOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithPayout = rawOrders.map(ord => {
      const plainObj = formatOrderObj(ord);
      const shopLat = ord.restaurant?.lat || 28.5700;
      const shopLng = ord.restaurant?.lng || 77.3200;
      const custLat = ord.lat || 28.5355;
      const custLng = ord.lng || 77.3910;

      const distanceKm = calculateDistance(shopLat, shopLng, custLat, custLng);
      const predictedPayout = Math.round(30 + (distanceKm * 20));

      plainObj.tripDistanceKm = distanceKm;
      plainObj.predictedPayout = predictedPayout;
      return plainObj;
    });

    res.json({ success: true, orders: ordersWithPayout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const rawOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      }
    });

    if (!rawOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const plainObj = formatOrderObj(rawOrder);
    const shopLat = rawOrder.restaurant?.lat || 28.5700;
    const shopLng = rawOrder.restaurant?.lng || 77.3200;
    const custLat = rawOrder.lat || 28.5355;
    const custLng = rawOrder.lng || 77.3910;

    const distanceKm = calculateDistance(shopLat, shopLng, custLat, custLng);
    plainObj.tripDistanceKm = distanceKm;
    plainObj.predictedPayout = Math.round(30 + (distanceKm * 20));

    res.json({ success: true, order: plainObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { restaurant: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await prisma.orderTimeline.create({
      data: {
        orderId: existing.id,
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`
      }
    });

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { status },
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      }
    });

    const order = formatOrderObj(updated);

    try {
      const io = getIO();
      io.to(`order_${order.id}`).emit('order:status_updated', {
        orderId: order.id,
        status: order.status,
        timeline: order.timeline
      });

      if (status === 'VENDOR_ACCEPTED') {
        const shopLat = updated.restaurant?.lat || 28.5700;
        const shopLng = updated.restaurant?.lng || 77.3200;
        const custLat = updated.lat || 28.5355;
        const custLng = updated.lng || 77.3910;
        const distanceKm = calculateDistance(shopLat, shopLng, custLat, custLng);
        const payout = Math.round(30 + (distanceKm * 20));

        io.to('drivers_pool').emit('delivery:new_job_available', {
          orderId: order.id,
          orderCode: order.orderId,
          restaurantName: updated.restaurant?.name,
          vendorType: order.orderType,
          distanceKm,
          payout
        });
      }
    } catch (e) {
      console.log('Socket update warning:', e.message);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.acceptDeliveryJob = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (existing.deliveryPartnerId && existing.deliveryPartnerId !== req.user.id) {
      return res.status(400).json({ success: false, message: 'This delivery job has already been taken by another driver' });
    }

    await prisma.orderTimeline.create({
      data: {
        orderId: existing.id,
        status: 'COURIER_ASSIGNED',
        timestamp: new Date(),
        note: `Delivery partner ${req.user.name} accepted job`
      }
    });

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        deliveryPartnerId: req.user.id,
        status: 'COURIER_ASSIGNED'
      },
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      }
    });

    const order = formatOrderObj(updated);

    try {
      const io = getIO();
      io.to(`order_${order.id}`).emit('order:status_updated', {
        orderId: order.id,
        status: order.status,
        timeline: order.timeline
      });
    } catch (e) {
      console.log('Socket broadcast warning:', e.message);
    }

    res.json({ success: true, order, message: 'Delivery job accepted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignDeliveryPartner = async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await prisma.orderTimeline.create({
      data: {
        orderId: existing.id,
        status: 'COURIER_ASSIGNED',
        timestamp: new Date(),
        note: 'Delivery partner assigned by admin'
      }
    });

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        deliveryPartnerId,
        status: 'COURIER_ASSIGNED'
      },
      include: {
        restaurant: true,
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        items: true,
        timeline: true
      }
    });

    const order = formatOrderObj(updated);

    try {
      const io = getIO();
      io.to(`order_${order.id}`).emit('order:status_updated', {
        orderId: order.id,
        status: order.status,
        timeline: order.timeline
      });
    } catch (e) {
      console.log('Socket assignment warning:', e.message);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
