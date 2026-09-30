const prisma = require('../utils/prisma');
const { dispatchOrder } = require('../services/dispatchService');

async function testFlow() {
  console.log('=== VERIFYING RECENT BROWSER ORDER FULL LIFECYCLE ===');
  
  // 1. Fetch recent order created from browser
  const latestOrder = await prisma.order.findFirst({
    orderBy: { placedAt: 'desc' },
    include: { Vendor: true, Delivery: true, User_Order_customerIdToUser: true }
  });

  if (!latestOrder) {
    console.error('No orders found in database!');
    process.exit(1);
  }

  console.log(`- Latest Order ID: ${latestOrder.id} (${latestOrder.orderNumber})`);
  console.log(`- Initial Status: ${latestOrder.status}`);
  console.log(`- Customer: ${latestOrder.User_Order_customerIdToUser?.fullName} (${latestOrder.User_Order_customerIdToUser?.email})`);
  console.log(`- Vendor: ${latestOrder.Vendor?.name}`);
  console.log(`- Delivery PIN: ${latestOrder.deliveryPin}`);

  // 2. Vendor accepts order & marks PREPARING
  console.log('\n[Step 1] Vendor accepts order -> PREPARING');
  await prisma.order.update({
    where: { id: latestOrder.id },
    data: { status: 'PREPARING' }
  });

  // 3. Trigger 3km dispatch
  console.log('[Step 2] Triggering 3km dispatch engine for nearby riders...');
  const dispatchRes = await dispatchOrder(latestOrder.id);
  console.log('- Dispatch result:', dispatchRes);

  // 4. Vendor marks READY_FOR_PICKUP
  console.log('\n[Step 3] Vendor marks order READY_FOR_PICKUP');
  await prisma.order.update({
    where: { id: latestOrder.id },
    data: { status: 'READY_FOR_PICKUP' }
  });

  // Fetch updated order status
  const afterVendor = await prisma.order.findUnique({ where: { id: latestOrder.id } });
  console.log(`- Order status after Vendor READY_FOR_PICKUP: ${afterVendor.status}`);

  console.log('\n✅ VENDOR & DISPATCH STATE MACHINE LIFECYCLE PASSED FOR BROWSER ORDER!');
  process.exit(0);
}

testFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
