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
const { cleanStaleOrders } = require('../../services/staleOrderCleaner');
const { calculateDeliveryPayout } = require('../../utils/payoutCalculator');
const { dispatchOrder, acceptOffer, rejectOffer } = require('../../services/dispatchService');

const formatOrderObj = (ord) => {
  if (!ord) return null;

  const vendorObj = ord.Vendor || ord.restaurant || null;
  const customerObj = ord.User_Order_customerIdToUser || ord.customer || null;
  // Pick real assigned driver: prioritize Delivery.User, then deliveryPartnerId relation
  const driverObj = ord.Delivery?.User || ord.User_Order_deliveryPartnerIdToUser || (ord.vendorUserId ? ord.User_Order_vendorUserIdToUser : null) || ord.deliveryPartner || null;

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

  const placedTime = ord.placedAt ? new Date(ord.placedAt) : new Date();
  const estPrepMinutes = Math.min(15 + items.length * 2, 35);
  const estDeliveryMinutes = estPrepMinutes + 15;
  const estDeliveryAt = new Date(placedTime.getTime() + estDeliveryMinutes * 60000);
  const locationName = ord.Address
    ? [ord.Address.addressLine, ord.Address.city].filter(Boolean).join(', ')
    : (customerObj?.fullName ? `${customerObj.fullName}'s Location` : 'Customer Delivery Location');

  return {
    _id: ord.id,
    id: ord.id,
    orderId: ord.orderNumber || ord.id,
    orderNumber: ord.orderNumber || ord.id,
    orderType: ord.orderType,
    shoppingMode: ord.orderType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS',
    status: ord.status,
    deliveryPin: ord.deliveryPin || null,
    subtotal: Number(ord.subtotal || 0),
    deliveryFee: Number(ord.deliveryFee || 0),
    tax: Number(ord.tax || 0),
    discount: Number(ord.discount || 0),
    totalAmount: Number(ord.totalAmount || 0),
    deliveryNotes: ord.deliveryNotes || '',
    placedAt: ord.placedAt,
    vendorReceivedAt: ord.placedAt,
    locationName,
    customerLocationName: locationName,
    estimatedPrepMinutes: estPrepMinutes,
    predictedDeliveryMinutes: estDeliveryMinutes,
    estimatedDeliveryTime: estDeliveryAt.toISOString(),
    updatedAt: ord.updatedAt,
    restaurant: vendorObj ? {
      _id: vendorObj.id,
      id: vendorObj.id,
      name: vendorObj.name,
      phone: vendorObj.phone,
      address: vendorObj.address,
      city: vendorObj.city,
      latitude: vendorObj.latitude ? Number(vendorObj.latitude) : 28.5700,
      longitude: vendorObj.longitude ? Number(vendorObj.longitude) : 77.3200,
      lat: vendorObj.latitude ? Number(vendorObj.latitude) : 28.5700,
      lng: vendorObj.longitude ? Number(vendorObj.longitude) : 77.3200,
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
      avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
    } : null,
    customerId: customerObj ? customerObj.id : ord.customerId,
    address: ord.Address ? {
      addressLine: ord.Address.addressLine,
      street: ord.Address.addressLine,
      city: ord.Address.city,
      state: ord.Address.state,
      pincode: ord.Address.pincode,
      latitude: ord.dropLat ? Number(ord.dropLat) : (ord.Address.latitude ? Number(ord.Address.latitude) : (vendorObj?.latitude ? Number(vendorObj.latitude) : 28.4866)),
      longitude: ord.dropLng ? Number(ord.dropLng) : (ord.Address.longitude ? Number(ord.Address.longitude) : (vendorObj?.longitude ? Number(vendorObj.longitude) : 77.2918)),
      lat: ord.dropLat ? Number(ord.dropLat) : (ord.Address.latitude ? Number(ord.Address.latitude) : (vendorObj?.latitude ? Number(vendorObj.latitude) : 28.4866)),
      lng: ord.dropLng ? Number(ord.dropLng) : (ord.Address.longitude ? Number(ord.Address.longitude) : (vendorObj?.longitude ? Number(vendorObj.longitude) : 77.2918))
    } : null,
    deliveryPartner: driverObj ? {
      _id: driverObj.id,
      id: driverObj.id,
      name: driverObj.fullName || driverObj.name,
      phone: driverObj.phone,
      vehicleType: driverObj.vehicleType || 'Bike',
      ratings: driverObj.ratings || 4.9,
      avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
    } : null,
    deliveryPartnerId: driverObj?.id || null,
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

    // Block orders if vendor store is closed / offline
    if (vendor.status === 'closed' || vendor.status === 'offline') {
      return res.status(400).json({
        success: false,
        message: `Cannot place order: "${vendor.name}" is currently closed / offline and not accepting orders.`
      });
    }

    // Enforce active payment method restriction (COD only; online gateways disabled for maintenance)
    const submittedMethod = String(req.body.paymentMethod || req.body.paymentProvider || 'COD').toUpperCase();
    if (submittedMethod !== 'COD') {
      return res.status(400).json({
        success: false,
        message: 'Online payment gateways are currently disabled for maintenance. Please select Cash on Delivery (COD).'
      });
    }

    // Fetch live product records from PostgreSQL to guarantee accurate prices & availability
    const productIds = rawItems.map(i => i.productId);
    const liveProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const liveProductMap = new Map(liveProducts.map(p => [p.id, p]));

    // Verify all items in cart are currently available in live DB
    for (const item of rawItems) {
      const liveProd = liveProductMap.get(item.productId);
      if (!liveProd || liveProd.isAvailable === false) {
        return res.status(400).json({
          success: false,
          message: `Cannot place order: "${liveProd?.name || item.name || 'An item'}" is currently marked out of stock.`
        });
      }
    }

    let subtotal = 0;
    const orderItemsData = rawItems.map(item => {
      const liveProd = liveProductMap.get(item.productId);
      // Re-validate unit price against live database product record
      const itemPrice = liveProd
        ? Number(liveProd.discountPrice || liveProd.price || 0)
        : Number(item.price || 0);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;
      return {
        id: crypto.randomUUID(),
        productId: item.productId,
        name: liveProd?.name || item.name || 'Item',
        unitPrice: itemPrice,
        lineTotal: itemTotal,
        quantity: item.quantity,
        selectedWeight: item.selectedWeight || null,
        isVeg: Boolean(liveProd?.isVeg ?? item.isVeg ?? true),
        image: liveProd?.image || item.image || ''
      };
    });

    const deliveryFee = Number(vendor.deliveryFee || 30);
    const tax = Math.round(subtotal * 0.05);
    const discount = Number(cart.discount || 0);
    const totalAmount = Math.max(0, subtotal + deliveryFee + tax - discount);

    const orderIdCode = `KRAW-${Date.now().toString().slice(-6)}`;
    const newOrderId = crypto.randomUUID();
    // Unique 4-digit PIN for this order to be verified by driver on delivery
    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Parse incoming customer live address coordinates
    const inputLat = (address?.latitude !== undefined && address?.latitude !== null && !isNaN(Number(address.latitude)))
      ? Number(address.latitude)
      : ((address?.lat !== undefined && address?.lat !== null && !isNaN(Number(address.lat))) ? Number(address.lat) : null);
    const inputLng = (address?.longitude !== undefined && address?.longitude !== null && !isNaN(Number(address.longitude)))
      ? Number(address.longitude)
      : ((address?.lng !== undefined && address?.lng !== null && !isNaN(Number(address.lng))) ? Number(address.lng) : null);

    let finalAddressId = null;
    let selectedAddrRecord = null;

    // If customer provided an address object at checkout, persist it as a verified address record
    if (address && typeof address === 'object' && (address.street || address.addressLine || address.city || inputLat !== null)) {
      const addrLine = address.addressLine || address.street || (inputLat ? `Live GPS Location (${inputLat.toFixed(4)}, ${inputLng.toFixed(4)})` : 'Customer Address');
      const addrCity = address.city || vendor.city || 'Faridabad';
      const addrState = address.state || 'Haryana';
      const addrPincode = address.pincode || '121009';

      selectedAddrRecord = await prisma.address.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user.id,
          label: address.title || address.label || 'Delivery Address',
          addressLine: addrLine,
          city: addrCity,
          state: addrState,
          pincode: addrPincode,
          latitude: inputLat,
          longitude: inputLng,
          isDefault: true
        }
      });
      finalAddressId = selectedAddrRecord.id;
    } else if (addressId) {
      selectedAddrRecord = await prisma.address.findFirst({
        where: { id: addressId, userId: req.user.id }
      });
      if (!selectedAddrRecord) {
        return res.status(403).json({ success: false, message: 'Specified delivery address does not belong to your account.' });
      }
      finalAddressId = selectedAddrRecord.id;
    } else {
      selectedAddrRecord = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
      finalAddressId = selectedAddrRecord?.id || null;
    }

    const pickupLat = vendor.latitude ? Number(vendor.latitude) : null;
    const pickupLng = vendor.longitude ? Number(vendor.longitude) : null;
    const dropLat = inputLat !== null
      ? inputLat
      : (selectedAddrRecord?.latitude ? Number(selectedAddrRecord.latitude) : null);
    const dropLng = inputLng !== null
      ? inputLng
      : (selectedAddrRecord?.longitude ? Number(selectedAddrRecord.longitude) : null);

    if (pickupLat === null || pickupLng === null || isNaN(pickupLat) || isNaN(pickupLng)) {
      return res.status(400).json({ success: false, message: 'Cannot place order: Vendor store location coordinates are missing.' });
    }
    if (dropLat === null || dropLng === null || isNaN(dropLat) || isNaN(dropLng)) {
      return res.status(400).json({ success: false, message: 'Cannot place order: Please select a valid delivery address with real GPS location.' });
    }

    // Execute Order creation in a database transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          id: newOrderId,
          orderNumber: orderIdCode,
          orderType: targetCartType,
          customerId: req.user.id,
          vendorId: vendor.id,
          addressId: finalAddressId,
          vendorUserId: null,
          deliveryPartnerId: null, // Unassigned: driver is assigned when job is accepted
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          subtotal,
          deliveryFee,
          tax,
          discount,
          totalAmount,
          status: 'PENDING',
          deliveryNotes: deliveryNotes || '',
          deliveryPin,
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
          Address: true,
          User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
          OrderItem: true,
          OrderTimeline: true,
          Payment: true
        }
      });

      // Persistent Notification for Customer
      await tx.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user.id,
          title: `Order Placed (${orderIdCode})`,
          message: `Your ${targetCartType === 'FRESH' ? 'Fresh Mandi' : 'Cravings'} order of ₹${totalAmount} has been placed successfully! Share PIN ${deliveryPin} upon delivery.`,
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
            message: `New order of ₹${totalAmount} received for ${vendor.name}. Please accept and prepare.`,
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

    // Socket.IO Notification — ONLY to the target vendor and customer (no global broadcast)
    try {
      const io = getIO();
      // Notify only the specific vendor who owns this restaurant
      if (vendor.id) {
        io.to(`vendor_${vendor.id}`).emit('order:created', { order });
      }
      // Notify only the customer who placed this order (via their order room)
      io.to(`order_${newOrderId}`).emit('order:created', { order });
    } catch (e) {
      console.log('Socket notification warning:', e.message);
    }

    // Rider notification occurs downstream after vendor accepts order (in updateOrderStatus / CONFIRMED / PREPARING)


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
      // STRICT MULTI-TENANT ISOLATION: Rider can ONLY see orders assigned to or delivered by them
      whereClause.OR = [
        { deliveryPartnerId: req.user.id },
        { vendorUserId: req.user.id },
        { Delivery: { deliveryPartnerId: req.user.id } }
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
        Address: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_deliveryPartnerIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } } } },
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
        Address: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_deliveryPartnerIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } } } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    if (!rawOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role-based Access Control: Customers, vendors, and delivery partners can only view their own orders
    const roleUpper = (req.user.role || '').toUpperCase();
    const isOwnerCustomer = rawOrder.customerId === req.user.id;
    const isStoreVendor = rawOrder.Vendor?.ownerUserId === req.user.id;
    const isAssignedDriver = rawOrder.deliveryPartnerId === req.user.id || rawOrder.vendorUserId === req.user.id || rawOrder.Delivery?.deliveryPartnerId === req.user.id;
    const isAdmin = roleUpper === 'ADMIN';

    let hasActiveOffer = false;
    if (roleUpper === 'DELIVERY_PARTNER' || roleUpper === 'DRIVER') {
      const activeOffer = await prisma.deliveryOffer.findFirst({
        where: {
          orderId: rawOrder.id,
          riderId: req.user.id,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });
      if (activeOffer) hasActiveOffer = true;
    }

    if (!isOwnerCustomer && !isStoreVendor && !isAssignedDriver && !isAdmin && !hasActiveOffer) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this order' });
    }

    const order = formatOrderObj(rawOrder);

    // SECURITY: Delivery PIN must ONLY be visible to the customer and admin.
    if (!isOwnerCustomer && !isAdmin) {
      order.deliveryPin = null;
    }

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
    let { status, note, deliveryPin } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const targetOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: id }, { orderNumber: id }]
      },
      include: {
        Vendor: true,
        Address: true,
        Delivery: true,
        User_Order_customerIdToUser: true
      }
    });

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Terminal state protection: DELIVERED or CANCELLED orders cannot be mutated
    if (['DELIVERED', 'CANCELLED'].includes(targetOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `This order is already ${targetOrder.status.toLowerCase()} and cannot be updated further.`
      });
    }

    // Access Control: Verify caller has permission to update this order
    const updaterRole = (req.user.role || '').toUpperCase();
    const isOwnerCustomer = targetOrder.customerId === req.user.id;
    const isStoreVendor = targetOrder.Vendor?.ownerUserId === req.user.id;
    const isAssignedDriver = targetOrder.deliveryPartnerId === req.user.id || targetOrder.vendorUserId === req.user.id || targetOrder.Delivery?.deliveryPartnerId === req.user.id;
    const isAdmin = updaterRole === 'ADMIN';

    // Enforce server-side State Machine transition rules
    const validTransitions = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'CANCELLED'],
      'PREPARING': ['PACKING', 'READY_FOR_PICKUP', 'CANCELLED'],
      'PACKING': ['READY_FOR_PICKUP', 'CANCELLED'],
      'READY_FOR_PICKUP': ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
      'ASSIGNED': ['PICKED_UP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
      'PICKED_UP': ['OUT_FOR_DELIVERY', 'CANCELLED'],
      'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED']
    };

    if (!isAdmin) {
      const allowedNext = validTransitions[targetOrder.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition order status from ${targetOrder.status} to ${status}.`
        });
      }
    }

    if (updaterRole === 'DELIVERY_PARTNER' || updaterRole === 'DRIVER') {
      if (!isAssignedDriver && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not assigned to deliver this order' });
      }
    } else if (updaterRole === 'VENDOR') {
      if (!isStoreVendor && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You do not own the store for this order' });
      }
      const vendorAllowedStatuses = ['CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'CANCELLED'];
      if (!vendorAllowedStatuses.includes(status) && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Vendors may only update status to CONFIRMED, PREPARING, PACKING, READY_FOR_PICKUP, or CANCELLED.' });
      }
    } else if (updaterRole === 'CONSUMER' || updaterRole === 'CUSTOMER') {
      if (!isOwnerCustomer && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not authorized to update this order' });
      }
      if (status !== 'CANCELLED') {
        return res.status(403).json({ success: false, message: 'Customers may only cancel orders' });
      }
    }

    // 4-Digit PIN Verification & Geofence Proximity when completing delivery (required for riders, bypassed for ADMIN override)
    if (status === 'DELIVERED' && !isAdmin) {
      const orderId = targetOrder.id;

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

      // 2. Geofence Proximity Check (Rider must be within 350m of dropoff)
      const riderLat = targetOrder.Delivery?.currentLat;
      const riderLng = targetOrder.Delivery?.currentLng;
      const dropLat = targetOrder.dropLat ?? targetOrder.Address?.latitude;
      const dropLng = targetOrder.dropLng ?? targetOrder.Address?.longitude;

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
      const expectedPin = String(targetOrder.deliveryPin || '').trim();
      const enteredPin = String(deliveryPin || '').trim();
      if (!expectedPin) {
        return res.status(400).json({ success: false, message: 'Delivery PIN is unavailable for this order.' });
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

    // Dynamic timeline notes
    if (!note) {
      if (status === 'CONFIRMED') {
        note = 'Store accepted order. Finding nearby delivery partner...';
      } else if (status === 'CANCELLED') {
        note = 'Vendor rejected the order.';
      } else if (status === 'PREPARING') {
        note = 'Store accepted order and is preparing. Delivery partner notified for pickup.';
      } else if (status === 'OUT_FOR_DELIVERY') {
        note = 'Order given to delivery partner and dispatched for delivery.';
      } else if (status === 'DELIVERED') {
        note = 'Order delivered successfully. Verified with 4-digit PIN.';
      } else {
        note = `Order status updated to ${status.replace(/_/g, ' ')}`;
      }
    }

    const now = new Date();

    const updatedOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        status,
        updatedAt: now,
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status,
            note
          }
        }
      },
      include: {
        Vendor: true,
        Address: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_deliveryPartnerIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } } } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    // Synchronize delivery record status
    if (status === 'OUT_FOR_DELIVERY' || status === 'PICKED_UP') {
      await prisma.delivery.updateMany({
        where: { orderId: targetOrder.id },
        data: { status: 'OUT_FOR_DELIVERY', pickupAt: now }
      });
    } else if (status === 'DELIVERED') {
      await prisma.delivery.updateMany({
        where: { orderId: targetOrder.id },
        data: { status: 'DELIVERED', deliveredAt: now }
      });
      await prisma.payment.updateMany({
        where: { orderId: targetOrder.id, method: 'COD' },
        data: { status: 'PAID', paidAt: now, collectedBy: req.user.id }
      });
    }

    // Trigger intelligent 3 km dispatch to nearby riders ONLY when status transition is CONFIRMED (PENDING -> CONFIRMED)
    if (status === 'CONFIRMED') {
      if (!updatedOrder.deliveryPartnerId && !updatedOrder.Delivery?.deliveryPartnerId) {
        dispatchOrder(updatedOrder.id).catch(err => console.warn('[AutoDispatch Error on status update]:', err.message));
      }
    }

    // Create Notification for Customer
    const notifTitle = status === 'CANCELLED' ? 'Order Rejected' : `Order Status: ${status.replace(/_/g, ' ')}`;
    const notifMessage = status === 'CANCELLED' ? 'Your order was rejected by the store.' : note;

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: updatedOrder.customerId,
        title: notifTitle,
        message: notifMessage,
        type: 'ORDER_STATUS_UPDATE'
      }
    }).catch(e => console.warn('Notification warning:', e.message));

    const formatted = formatOrderObj(updatedOrder);

    // Socket status update
    try {
      const io = getIO();
      io.to(`order_${updatedOrder.id}`).emit('order:status_updated', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        timeline: formatted.timeline,
        deliveryPartner: formatted.deliveryPartner
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
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { Vendor: true, Address: true, Delivery: true }
    });

    if (!targetOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    // Look for pending offer for this driver
    let offer = await prisma.deliveryOffer.findFirst({
      where: {
        orderId: targetOrder.id,
        riderId: req.user.id,
        status: 'PENDING'
      }
    });

    if (!offer) {
      return res.status(400).json({
        success: false,
        message: 'No active delivery offer found for your account. Delivery jobs can only be accepted from valid dispatch offers.'
      });
    }

    const result = await acceptOffer(offer.id, req.user.id);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    const reloaded = await prisma.order.findUnique({
      where: { id: targetOrder.id },
      include: {
        Vendor: true,
        Address: true,
        User_Order_customerIdToUser: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } },
        User_Order_deliveryPartnerIdToUser: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } },
        Delivery: { include: { User: { select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true } } } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    res.json({
      success: true,
      order: formatOrderObj(reloaded),
      message: 'Delivery job accepted successfully!'
    });
  } catch (err) {
    console.error('acceptDeliveryJob error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectDeliveryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });
    if (targetOrder) {
      const offer = await prisma.deliveryOffer.findFirst({
        where: {
          orderId: targetOrder.id,
          riderId: req.user.id,
          status: 'PENDING'
        }
      });
      if (offer) {
        await rejectOffer(offer.id, req.user.id, req.body?.reason || 'Rider declined');
      }
    }
    res.json({ success: true, message: 'Delivery job rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;
    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { Vendor: true, Address: true }
    });

    if (!targetOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    const driver = await prisma.user.findUnique({
      where: { id: deliveryPartnerId },
      select: { id: true, fullName: true, phone: true, vehicleType: true, ratings: true, avatar: true }
    });

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    await prisma.delivery.upsert({
      where: { orderId: targetOrder.id },
      update: { deliveryPartnerId, status: 'ASSIGNED' },
      create: {
        id: crypto.randomUUID(),
        orderId: targetOrder.id,
        deliveryPartnerId,
        status: 'ASSIGNED',
        pickupLat: targetOrder.Vendor?.latitude ? Number(targetOrder.Vendor.latitude) : 28.5700,
        pickupLng: targetOrder.Vendor?.longitude ? Number(targetOrder.Vendor.longitude) : 77.3200,
        dropLat: targetOrder.dropLat ? Number(targetOrder.dropLat) : (targetOrder.Address?.latitude ? Number(targetOrder.Address.latitude) : (targetOrder.Vendor?.latitude ? Number(targetOrder.Vendor.latitude) : 28.4866)),
        dropLng: targetOrder.dropLng ? Number(targetOrder.dropLng) : (targetOrder.Address?.longitude ? Number(targetOrder.Address.longitude) : (targetOrder.Vendor?.longitude ? Number(targetOrder.Vendor.longitude) : 77.2918))
      }
    });

    const updatedOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        deliveryPartnerId: deliveryPartnerId,
        status: 'ASSIGNED',
        OrderTimeline: {
          create: {
            id: crypto.randomUUID(),
            status: 'ASSIGNED',
            note: `Delivery partner ${driver.fullName} assigned by admin.`
          }
        }
      },
      include: {
        Vendor: true,
        Address: true,
        User_Order_customerIdToUser: true,
        User_Order_deliveryPartnerIdToUser: true,
        Delivery: { include: { User: true } },
        OrderItem: true,
        OrderTimeline: true,
        Payment: true
      }
    });

    const formatted = formatOrderObj(updatedOrder);

    try {
      const io = getIO();
      io.to(`order_${updatedOrder.id}`).emit('order:driver_assigned', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        deliveryPartner: formatted.deliveryPartner
      });
      io.to(`order_${updatedOrder.id}`).emit('order:status_updated', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        deliveryPartner: formatted.deliveryPartner,
        timeline: formatted.timeline
      });
    } catch (e) {
      console.warn('Socket emit warning on assign-delivery:', e.message);
    }

    res.json({ success: true, order: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cleanStaleOrdersHandler = async (req, res) => {
  try {
    const timeout = Number(req.body?.timeoutMinutes ?? req.query?.timeoutMinutes ?? 20);
    const result = await cleanStaleOrders(timeout);
    res.json({
      success: true,
      message: `Checked and cleaned stale orders older than ${timeout} minutes.`,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// In-memory driver rejections map: orderId -> Set of driverUserIds
const rejectedJobDrivers = new Map();

exports.rejectDeliveryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!rejectedJobDrivers.has(targetOrder.id)) {
      rejectedJobDrivers.set(targetOrder.id, new Set());
    }
    rejectedJobDrivers.get(targetOrder.id).add(driverId);

    res.json({
      success: true,
      message: 'Job declined successfully. You will not be alerted for this order again.',
      orderId: targetOrder.id
    });
  } catch (err) {
    console.error('rejectDeliveryJob error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRejectedDriversForOrder = (orderId) => {
  return rejectedJobDrivers.get(orderId) || new Set();
};

