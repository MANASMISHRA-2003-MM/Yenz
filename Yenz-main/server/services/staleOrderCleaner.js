const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { getIO } = require('../socket/socketHandler');

/**
 * Service to automatically unassign stale pickup jobs:
 * If a delivery partner accepted a delivery job but failed to pick up / arrive at the store
 * within timeoutMinutes (default: 20 minutes), the order is released back to the available pool.
 */
async function cleanStaleOrders(timeoutMinutes = 20) {
  try {
    const mins = Number(timeoutMinutes ?? 20);
    const bufferMs = mins === 0 ? 3000 : 0;
    const cutoffTime = new Date(Date.now() - mins * 60 * 1000 + bufferMs);

    // Find orders that are assigned to a driver, not yet picked up, and past the cutoff
    const staleOrders = await prisma.order.findMany({
      where: {
        OR: [
          { deliveryPartnerId: { not: null } },
          { vendorUserId: { not: null } }
        ],
        status: { in: ['CONFIRMED', 'ASSIGNED'] },
        Delivery: {
          status: 'ASSIGNED',
          pickupAt: null,
          createdAt: { lte: cutoffTime }
        }
      },
      include: {
        Vendor: true,
        Address: true,
        Delivery: true,
        User_Order_customerIdToUser: true
      }
    });

    if (!staleOrders || staleOrders.length === 0) {
      return { count: 0, unassignedOrders: [] };
    }

    const unassignedList = [];

    for (const order of staleOrders) {
      const prevDriverId = order.deliveryPartnerId || order.vendorUserId;

      // 1. Delete or reset previous delivery trip record
      await prisma.delivery.deleteMany({
        where: { orderId: order.id }
      });

      // 2. Unassign driver from order and add timeline note
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryPartnerId: null,
          vendorUserId: null,
          OrderTimeline: {
            create: {
              id: crypto.randomUUID(),
              status: order.status,
              note: `Delivery partner unassigned due to pickup inactivity (>${timeoutMinutes}m). Job returned to available driver pool.`
            }
          }
        }
      });

      // 3. Notify Customer
      await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: order.customerId,
          title: 'Delivery Partner Reassigning',
          message: 'Your delivery partner was reassigned for faster pickup. Searching for nearby available drivers.',
          type: 'ORDER_STATUS_UPDATE'
        }
      }).catch(e => console.warn('Customer notification warning:', e.message));

      // 4. Notify Driver who was unassigned
      if (prevDriverId) {
        await prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            userId: prevDriverId,
            title: 'Job Auto-Unassigned',
            message: `Order #${order.orderNumber} was unassigned due to pickup inactivity exceeding ${timeoutMinutes} minutes.`,
            type: 'DELIVERY_UNASSIGNED'
          }
        }).catch(e => console.warn('Driver notification warning:', e.message));
      }

      // 5. Trigger dispatch service to find next available nearby driver
      try {
        const io = getIO();
        const { dispatchOrder } = require('./dispatchService');
        dispatchOrder(order.id).catch(e => console.warn('[StaleCleaner Dispatch Error]:', e.message));

        io.to(`order_${order.id}`).emit('order:driver_assigned', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          deliveryPartner: null
        });
        io.to(`order_${order.id}`).emit('order:status_updated', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryPartner: null
        });
      } catch (e) {
        console.warn('Socket broadcast warning on stale release:', e.message);
      }

      unassignedList.push({ orderId: order.id, orderNumber: order.orderNumber, prevDriverId });
    }

    return {
      count: unassignedList.length,
      unassignedOrders: unassignedList
    };
  } catch (err) {
    console.error('Error cleaning stale orders:', err);
    throw err;
  }
}

let cleanerInterval = null;

function startStaleOrderCron(intervalMs = 60000, timeoutMinutes = 20) {
  if (cleanerInterval) clearInterval(cleanerInterval);
  cleanerInterval = setInterval(async () => {
    try {
      const res = await cleanStaleOrders(timeoutMinutes);
      if (res.count > 0) {
        console.log(`[AutoCleaner] Released ${res.count} stale delivery jobs back to pool.`);
      }
    } catch (e) {
      console.warn('[AutoCleaner] Interval error:', e.message);
    }
  }, intervalMs);
}

module.exports = {
  cleanStaleOrders,
  startStaleOrderCron
};
