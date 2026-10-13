const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

async function testRiderIsolation() {
  console.log('--- STARTING RIDER ISOLATION & INDEPENDENCE VERIFICATION ---');

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_key';

  // 1. Ensure Rider A and Rider B exist in database
  console.log('\n[Step 1] Ensuring Rider A and Rider B exist...');
  const passwordHash = await bcrypt.hash('password123', 10);

  let riderA = await prisma.user.findFirst({
    where: { email: 'driver.arjun@krawing.com' }
  });
  if (!riderA) {
    riderA = await prisma.user.create({
      data: {
        fullName: 'Arjun Delivery Partner',
        email: 'driver.arjun@krawing.com',
        phone: '9000000002',
        passwordHash,
        role: 'DELIVERY_PARTNER',
        vehicleType: 'Bike',
        ratings: 4.9,
        isOnline: true,
        status: 'active'
      }
    });
  }

  let riderB = await prisma.user.findFirst({
    where: { email: 'driver.deepak@krawing.com' }
  });
  if (!riderB) {
    riderB = await prisma.user.create({
      data: {
        fullName: 'Deepak Quick Courier',
        email: 'driver.deepak@krawing.com',
        phone: '9000000008',
        passwordHash,
        role: 'DELIVERY_PARTNER',
        vehicleType: 'EV Scooter',
        ratings: 4.8,
        isOnline: true,
        status: 'active'
      }
    });
  }

  console.log(`- Rider A ID: ${riderA.id} (${riderA.fullName})`);
  console.log(`- Rider B ID: ${riderB.id} (${riderB.fullName})`);

  // Generate tokens
  const tokenA = jwt.sign({ id: riderA.id, role: riderA.role }, JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: riderB.id, role: riderB.role }, JWT_SECRET, { expiresIn: '1h' });

  // 2. Find a test customer and vendor
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  const vendor = await prisma.vendor.findFirst();
  const address = await prisma.address.findFirst({ where: { userId: customer?.id } });

  if (!customer || !vendor) {
    throw new Error('Customer or Vendor missing from DB!');
  }

  const orderNumPrefix = `ISO-${Date.now().toString().slice(-5)}`;

  // 3. Create Order A assigned to Rider A
  console.log('\n[Step 2] Creating Order A (assigned to Rider A)...');
  const orderA = await prisma.order.create({
    data: {
      orderNumber: `${orderNumPrefix}-A`,
      customerId: customer.id,
      vendorId: vendor.id,
      vendorUserId: null,
      deliveryPartnerId: riderA.id,
      addressId: address?.id,
      orderType: 'CRAVINGS',
      status: 'OUT_FOR_DELIVERY',
      subtotal: 350,
      deliveryFee: 65,
      tax: 18,
      totalAmount: 433,
      Delivery: {
        create: {
          deliveryPartnerId: riderA.id,
          status: 'OUT_FOR_DELIVERY',
          pickupLat: 28.5700,
          pickupLng: 77.3200,
          dropLat: 28.5355,
          dropLng: 77.3910,
          earnings: 65
        }
      }
    }
  });
  console.log(`- Created Order A: #${orderA.orderNumber} (id: ${orderA.id})`);

  // 4. Create Order B assigned to Rider B
  console.log('\n[Step 3] Creating Order B (assigned to Rider B)...');
  const orderB = await prisma.order.create({
    data: {
      orderNumber: `${orderNumPrefix}-B`,
      customerId: customer.id,
      vendorId: vendor.id,
      vendorUserId: null,
      deliveryPartnerId: riderB.id,
      addressId: address?.id,
      orderType: 'CRAVINGS',
      status: 'DELIVERED',
      subtotal: 500,
      deliveryFee: 85,
      tax: 25,
      totalAmount: 610,
      Delivery: {
        create: {
          deliveryPartnerId: riderB.id,
          status: 'DELIVERED',
          pickupLat: 28.5700,
          pickupLng: 77.3200,
          dropLat: 28.5355,
          dropLng: 77.3910,
          earnings: 85
        }
      }
    }
  });
  console.log(`- Created Order B: #${orderB.orderNumber} (id: ${orderB.id})`);

  // 5. Create Order C (Unassigned)
  console.log('\n[Step 4] Creating Order C (Unassigned, status PREPARING)...');
  const orderC = await prisma.order.create({
    data: {
      orderNumber: `${orderNumPrefix}-C`,
      customerId: customer.id,
      vendorId: vendor.id,
      vendorUserId: null,
      deliveryPartnerId: null,
      addressId: address?.id,
      orderType: 'CRAVINGS',
      status: 'PREPARING',
      subtotal: 200,
      deliveryFee: 45,
      tax: 10,
      totalAmount: 255
    }
  });
  console.log(`- Created Order C: #${orderC.orderNumber} (id: ${orderC.id})`);

  // 6. Test GET /api/orders with Rider A's token
  console.log('\n[Step 5] Querying /api/orders with Rider A token...');
  const resOrdersA = await fetch('http://localhost:5000/api/orders', {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const dataOrdersA = await resOrdersA.json();

  console.log(`- Rider A received ${dataOrdersA.orders?.length} orders`);
  const idsA = dataOrdersA.orders?.map(o => o.orderNumber) || [];
  console.log(`- Order Numbers received by Rider A:`, idsA.filter(n => n.startsWith(orderNumPrefix)));

  const hasOrderA = idsA.includes(orderA.orderNumber);
  const hasOrderB = idsA.includes(orderB.orderNumber);
  const hasOrderC = idsA.includes(orderC.orderNumber);

  console.log(`  * Order A present: ${hasOrderA} (Expected: true)`);
  console.log(`  * Order B present: ${hasOrderB} (Expected: false)`);
  console.log(`  * Order C (unassigned) present: ${hasOrderC} (Expected: false)`);

  if (!hasOrderA || hasOrderB || hasOrderC) {
    throw new Error('Rider A order isolation failed! Saw other orders or unassigned orders.');
  }
  console.log('✅ Rider A isolation verified: only sees their own assigned order.');

  // 7. Test GET /api/orders with Rider B's token
  console.log('\n[Step 6] Querying /api/orders with Rider B token...');
  const resOrdersB = await fetch('http://localhost:5000/api/orders', {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const dataOrdersB = await resOrdersB.json();

  console.log(`- Rider B received ${dataOrdersB.orders?.length} orders`);
  const idsB = dataOrdersB.orders?.map(o => o.orderNumber) || [];
  console.log(`- Order Numbers received by Rider B:`, idsB.filter(n => n.startsWith(orderNumPrefix)));

  const bHasOrderA = idsB.includes(orderA.orderNumber);
  const bHasOrderB = idsB.includes(orderB.orderNumber);
  const bHasOrderC = idsB.includes(orderC.orderNumber);

  console.log(`  * Order A present: ${bHasOrderA} (Expected: false)`);
  console.log(`  * Order B present: ${bHasOrderB} (Expected: true)`);
  console.log(`  * Order C (unassigned) present: ${bHasOrderC} (Expected: false)`);

  if (bHasOrderA || !bHasOrderB || bHasOrderC) {
    throw new Error('Rider B order isolation failed! Saw other orders or unassigned orders.');
  }
  console.log('✅ Rider B isolation verified: only sees their own completed delivery.');

  // 8. Test Direct Access Protection: Rider B tries to view Order A (GET /api/orders/:id)
  console.log('\n[Step 7] Testing Direct Access: Rider B queries Order A by ID...');
  const resGetA = await fetch(`http://localhost:5000/api/orders/${orderA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const dataGetA = await resGetA.json();
  console.log(`- Status code: ${resGetA.status}, message: ${dataGetA.message}`);
  if (resGetA.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized order view, got ${resGetA.status}`);
  }
  console.log('✅ Direct order access protection verified: 403 Forbidden returned.');

  // 9. Test Mutation Protection: Rider B tries to update Order A status (PUT /api/orders/:id/status)
  console.log('\n[Step 8] Testing Mutation Protection: Rider B tries to update Order A status...');
  const resUpdate = await fetch(`http://localhost:5000/api/orders/${orderA.id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`
    },
    body: JSON.stringify({ status: 'DELIVERED', deliveryPin: '9999' })
  });
  const dataUpdate = await resUpdate.json();
  console.log(`- Status code: ${resUpdate.status}, message: ${dataUpdate.message}`);
  if (resUpdate.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized status update, got ${resUpdate.status}`);
  }
  console.log('✅ Status mutation protection verified: 403 Forbidden returned.');

  // Clean up test orders
  console.log('\n[Step 9] Cleaning up test orders...');
  await prisma.delivery.deleteMany({
    where: { orderId: { in: [orderA.id, orderB.id, orderC.id] } }
  });
  await prisma.order.deleteMany({
    where: { id: { in: [orderA.id, orderB.id, orderC.id] } }
  });
  console.log('✅ Cleanup complete.');

  console.log('\n🎉 ALL RIDER ISOLATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testRiderIsolation().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
