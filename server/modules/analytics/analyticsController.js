const prisma = require('../../utils/prisma');

const getAnalytics = async (req, res, next) => {
  try {
    const rawCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const statusCounts = rawCounts.map(item => ({
      _id: item.status,
      count: item._count._all
    }));

    const revenueTrend = [
      { day: 'Mon', revenue: 4200, orders: 12 },
      { day: 'Tue', revenue: 6800, orders: 18 },
      { day: 'Wed', revenue: 5900, orders: 15 },
      { day: 'Thu', revenue: 8400, orders: 22 },
      { day: 'Fri', revenue: 11200, orders: 29 },
      { day: 'Sat', revenue: 14500, orders: 38 },
      { day: 'Sun', revenue: 16800, orders: 42 }
    ];

    res.json({
      success: true,
      statusCounts,
      revenueTrend
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics };
