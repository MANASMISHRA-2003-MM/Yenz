const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const getDeliveryDashboard = async (req, res, next) => {
  try {
    const rawActive = await prisma.delivery.findFirst({
      where: {
        deliveryPartnerId: req.user.id,
        status: { in: ['ASSIGNED', 'PICKED_UP'] }
      },
      include: {
        order: true,
        restaurant: true
      }
    });

    const activeDelivery = formatWithId(rawActive);

    const rawPast = await prisma.delivery.findMany({
      where: {
        deliveryPartnerId: req.user.id,
        status: 'DELIVERED'
      },
      include: {
        restaurant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const pastDeliveries = formatWithId(rawPast);
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

module.exports = { getDeliveryDashboard, toggleOnlineStatus };
