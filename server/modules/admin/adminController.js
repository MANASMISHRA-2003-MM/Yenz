const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

// @desc Get Admin Dashboard Statistics
// @route GET /api/admin/metrics
const getAdminMetrics = async (req, res, next) => {
  try {
    const totalOrders = await prisma.order.count();
    const activeOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PLACED', 'VENDOR_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY']
        }
      }
    });
    const completedOrders = await prisma.order.count({ where: { status: 'DELIVERED' } });
    const cancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED' } });

    const revenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'DELIVERED' }
    });
    const revenue = revenueResult._sum.totalAmount || 0;

    const activeVendors = await prisma.restaurant.count({ where: { isOpen: true } });
    const totalDeliveryPartners = await prisma.user.count({ where: { role: 'delivery_partner' } });
    const totalCustomers = await prisma.user.count({ where: { role: 'consumer' } });

    res.json({
      success: true,
      metrics: {
        totalOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        revenue,
        activeVendors,
        totalDeliveryPartners,
        totalCustomers
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all users grouped by role or filtered
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let whereClause = {};
    if (role) whereClause.role = role;

    const rawUsers = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const users = rawUsers.map(u => {
      const { password, ...userWithoutPassword } = u;
      return formatWithId(userWithoutPassword);
    });

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc Update user status or role
// @route PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const rawUser = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });

    const { password, ...userWithoutPassword } = rawUser;
    const user = formatWithId(userWithoutPassword);

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc Resolve Dispute
// @route PUT /api/admin/disputes/:orderId
const resolveDispute = async (req, res, next) => {
  try {
    const { status, resolutionNote } = req.body;
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Dispute ${status || 'RESOLVED'}: ${resolutionNote || 'Admin resolved dispute'}`
      }
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { timeline: true }
    });

    res.json({ success: true, message: 'Dispute updated', order: formatWithId(updated) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminMetrics,
  getUsers,
  updateUser,
  resolveDispute
};
