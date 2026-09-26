const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');
const { getIO } = require('../../socket/socketHandler');

const formatOrderObj = (ord) => {
  if (!ord) return null;
  
  const vendorObj = ord.Vendor || ord.restaurant || null;
  const customerObj = ord.User_Order_customerIdToUser || ord.customer || null;
  const driverObj = ord.Delivery?.User || ord.User_Order_vendorUserIdToUser || ord.deliveryPartner || null;

  const rawItems = ord.OrderItem || ord.items || [];
  const items = rawItems.map(item => ({
    _id: item.id,
    id: item.id,
    foodId: item.productId,
    productId: item.productId,
    name: item.name,
    price: Number(item.unitPrice || item.price || 0),
    quantity: item.quantity,
    selectedWeight: item.selectedWeight || null,
    isVeg: Boolean(item.isVeg),
    image: item.image || item.Product?.image || ''
  }));

  const rawTimeline = ord.OrderTimeline || ord.timeline || [];
  const timeline = rawTimeline.map(t => ({
    status: t.status,
    timestamp: t.timestamp,
    note: t.note || ''
  }));

  const paymentObj = ord.Payment || null;

  return {
    _id: ord.id,
    id: ord.id,
    orderId: ord.orderNumber || ord.id,
    orderNumber: ord.orderNumber || ord.id,
    orderType: ord.orderType,
    shoppingMode: ord.orderType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS',
    status: ord.status,
    subtotal: Number(ord.subtotal || 0),
    deliveryFee: Number(ord.deliveryFee || 0),
    tax: Number(ord.tax || 0),
    discount: Number(ord.discount || 0),
    totalAmount: Number(ord.totalAmount || 0),
    deliveryNotes: ord.deliveryNotes || '',
    placedAt: ord.placedAt,
    updatedAt: ord.updatedAt,
    restaurant: vendorObj ? {
      _id: vendorObj.id,
      id: vendorObj.id,
      name: vendorObj.name,
      phone: vendorObj.phone,
      address: vendorObj.address,
      city: vendorObj.city,
      image: vendorObj.image,
      vendorType: vendorObj.vendorType
    } : null,
    restaurantId: vendorObj ? vendorObj.id : ord.vendorId,
    vendorId: ord.vendorId,
    customer: customerObj ? {
      _id: customerObj.id,
      id: customerObj.id,
      name: customerObj.fullName || customerObj.name,
      email: customerObj.email,
      phone: customerObj.phone,
      avatar: customerObj.avatar
    } : null,
    deliveryPartner: driverObj ? {
      _id: driverObj.id,
      id: driverObj.id,
      name: driverObj.fullName || driverObj.name,
      phone: driverObj.phone,
      vehicleType: driverObj.vehicleType,
      ratings: driverObj.ratings,
      avatar: driverObj.avatar
    } : null,
    paymentMethod: paymentObj?.method || 'COD',
    paymentStatus: paymentObj?.status || 'PENDING',
    payment: paymentObj ? {
      id: paymentObj.id,
      provider: paymentObj.provider,
      method: paymentObj.method,
      amount: Number(paymentObj.amount),
      status: paymentObj.status,
      paidAt: paymentObj.paidAt
    } : null,
    items,
    timeline
  };
};

exports.createOrder = async (req, res, next) => {
  try {
    const { address, addressId, paymentMethod = 'COD', deliveryNotes = '', shoppingMode, mode, cartType: inputCartType } = req.body;

    const modeInput = shoppingMode || mode || inputCartType;
    const targetCartType = (modeInput && modeInput.toString().toUpperCase().includes('FRESH')) ? 'FRESH' : 'CRAVINGS';

    const cart = await prisma.cart.findFirst({
      where: {
        userId: req.user.id,
        cartType: targetCartType
      },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });

    const rawItems = cart ? (cart.CartItem || []) : [];
    if (!cart || rawItems.length === 0) {
      const modeLabel = targetCartType === 'FRESH' ? 'Fresh Mandi' : 'Cravings';
      return res.status(400).json({ success: false, message: `Your ${modeLabel} basket is empty!` });
    }

    let vendor = cart.Vendor;
    if (!vendor && rawItems.length > 0) {
      const firstProdId = rawItems[0].productId;
      const prod = await prisma.product.findUnique({
        where: { id: firstProdId },
        include: { Vendor: true }
      });
      if (prod && prod.Vendor) {
        vendor = prod.Vendor;
      }
    }

    if (!vendor) {
      return res.status(400).json({ success: false, message: 'Vendor store not found for this cart' });
    }

    let subtotal = 0;
    const orderItemsData = rawItems.map(item => {
      const itemPrice = Number(item.price || item.Product?.price || 0);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;
      return {
        id: crypto.randomUUID(),
        productId: item.productId,
        name: item.name || item.Product?.name || 'Item',
        unitPrice: itemPrice,
        lineTotal: itemTotal,
        quantity: item.quantity,
        selectedWeight: item.selectedWeight || null,
        isVeg: Boolean(item.isVeg ?? item.Product?.isVeg ?? true),
        image: item.image || item.Product?.image || ''
      };
    });

    const deliveryFee = Number(vendor.deliveryFee || 30);
    const tax = Math.round(subtotal * 0.05);
    const discount = Number(cart.discount || 0);
    const totalAmount = Math.max(0, subtotal + deliveryFee + tax - discount);

    const orderIdCode = `KRAW-${Date.now().toString().slice(-6)}`;
    const newOrderId = crypto.randomUUID();

    // Find active delivery partner to assign automatically if available
    const availableDriver = await prisma.user.findFirst({
      where: { role: 'DELIVERY_PARTNER', isOnline: true }
    });

    // Execute Order creation in a database transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          id: newOrderId,
          orderNumber: orderIdCode,
          orderType: targetCartType,
          customerId: req.user.id,
          vendorId: vendor.id,
          addressId: addressId || null,
          vendorUserId: availableDriver ? availableDriver.id : null,
          subtotal,
          deliveryFee,
          tax,
          discount,
          totalAmount,
          status: 'PENDING',
          deliveryNotes: deliveryNotes || '',
          OrderItem: {
            create: orderItemsData
          },
          OrderTimeline: {
            create: [
              {
                id: crypto.randomUUID(),
                status: 'PENDING',
                note: targetCartType === 'FRESH' ? 'Fresh Sabzi Mandi order placed' : 'Cravings Food order placed'
              }
            ]
          },
          Payment: {
            create: {
              id: crypto.randomUUID(),
              provider: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
              method: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
              amount: totalAmount,
              status: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
              paidAt: paymentMethod === 'COD' ? null : new Date()
            }
          }
        },
        include: {
          Vendor: true,
          User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
          OrderItem: true,
          OrderTimeline: true,
          Payment: true
        }
      });

      // Create Delivery record linked to order
      if (availableDriver) {
        await tx.delivery.create({
          data: {
            id: crypto.randomUUID(),
            orderId: ord.id,
            deliveryPartnerId: availableDriver.id,
            status: 'ASSIGNED',
            pickupLat: vendor.latitude ? Number(vendor.latitude) : 28.5700,
            pickupLng: vendor.longitude ? Number(vendor.longitude) : 77.3200,
            dropLat: 28.5355,
            dropLng: 77.3910,
            earnings: 65.00,
            distanceKm: 3.40,
            estimatedMinutes: 20
          }
        });
      }

      // Persistent Notification for Customer
      await tx.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user.id,
          title: `Order Placed (${orderIdCode})`,
          message: `Your ${targetCartType === 'FRESH' ? 'Fresh Mandi' : 'Cravings'} order of ₹${totalAmount} has been placed successfully!`,
          type: 'ORDER_CREATED'
        }
      });

      // Persistent Notification for Vendor Owner
      if (vendor.ownerUserId) {
        await tx.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: vendor.ownerUserId,
            title: `New Incoming Order (${orderIdCode})`,
            message: `New order of ₹${totalAmount} received for ${vendor.name}`,
            type: 'NEW_ORDER'
          }
        });
      }

      // Reset cart items & reset vendor binding
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          vendorId: null,
          couponCode: null,
          discount: 0
        }
      });

      return ord;
    });

    const order = formatOrderObj(createdOrder);

    // Socket.IO Notification to Vendor & Driver
    try {
      const io = getIO();
      if (vendor.id) {
        io.to(`vendor_${vendor.id}`).emit('order:created', { order });
      }
      if (availableDriver) {
        io.to(`driver_${availableDriver.id}`).emit('job:new', { order });
      }
    } catch (e) {
      console.log('Socket notification warning:', e.message);
    }

    res.status(201).json({
      success: true,
      order,
      message: 'Order placed successfully!'
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    let whereClause = {};
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'CONSUMER' || roleUpper === 'CUSTOMER') {
      whereClause.customerId = req.user.id;
    } else if (roleUpper === 'VENDOR') {
      const vendorStore = await prisma.vendor.findFirst({ where: { ownerUserId: req.user.id } });
      whereClause.vendorId = vendorStore ? vendorStore.id : req.user.id;
    } else if (roleUpper === 'DELIVERY_PARTNER' || roleUpper === 'DRIVER') {
      whereClause.OR = [
        { vendorUserId: req.user.id },
        { Delivery: { deliveryPartnerId: req.user.id } },
        { status: { in: ['CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP'] } }
      ];
    }

    if (req.query.orderType) {
      const norm = req.query.orderType.toString().toUpperCase().includes('FRESH') ? 'FRESH' : 'CRAVINGS';
      whereClause.orderType = norm;
    }

    const rawOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        Vendor: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_vendorUserIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: true } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      },
      orderBy: { placedAt: 'desc' }
    });

    const orders = rawOrders.map(formatOrderObj);

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const rawOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderNumber: id }
        ]
      },
      include: {
        Vendor: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_vendorUserIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: true } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    if (!rawOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = formatOrderObj(rawOrder);

    res.json({
      success: true,
      order
    });
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const targetOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: id }, { orderNumber: id }]
      }
    });

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status,
        updatedAt: new Date(),
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status,
            note: note || `Order status updated to ${status}`
          }
        }
      },
      include: {
        Vendor: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_vendorUserIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: true } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    // Create Notification for Customer
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: updatedOrder.customerId,
        title: `Order Status: ${status}`,
        message: note || `Your order ${updatedOrder.orderNumber} is now ${status.replace(/_/g, ' ')}`,
        type: 'ORDER_STATUS_UPDATE'
      }
    }).catch(e => console.warn('Notification warning:', e.message));

    const formatted = formatOrderObj(updatedOrder);

    try {
      const io = getIO();
      io.to(`order_${updatedOrder.id}`).emit('order:status_updated', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        timeline: formatted.timeline
      });
    } catch (e) {
      console.log('Socket emit warning:', e.message);
    }

    res.json({
      success: true,
      order: formatted,
      message: `Order status updated to ${status}`
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.acceptDeliveryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });

    if (!targetOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        vendorUserId: req.user.id,
        status: 'ASSIGNED',
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status: 'ASSIGNED',
            note: 'Delivery partner accepted job'
          }
        }
      },
      include: {
        Vendor: true,
        User_Order_customerIdToUser: true,
        User_Order_vendorUserIdToUser: true,
        Delivery: true,
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    // Upsert delivery record
    await prisma.delivery.upsert({
      where: { orderId: order.id },
      update: { deliveryPartnerId: req.user.id, status: 'ASSIGNED' },
      create: {
        id: crypto.randomUUID(),
        orderId: order.id,
        deliveryPartnerId: req.user.id,
        status: 'ASSIGNED'
      }
    });

    res.json({ success: true, order: formatOrderObj(order), message: 'Delivery job accepted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;
    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });

    if (!targetOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        vendorUserId: deliveryPartnerId,
        status: 'ASSIGNED',
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status: 'ASSIGNED',
            note: 'Delivery partner assigned by admin'
          }
        }
      },
      include: {
        Vendor: true,
        User_Order_customerIdToUser: true,
        User_Order_vendorUserIdToUser: true,
        Delivery: true,
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    await prisma.delivery.upsert({
      where: { orderId: order.id },
      update: { deliveryPartnerId, status: 'ASSIGNED' },
      create: {
        id: crypto.randomUUID(),
        orderId: order.id,
        deliveryPartnerId,
        status: 'ASSIGNED'
      }
    });

    res.json({ success: true, order: formatOrderObj(order), message: 'Delivery partner assigned' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
