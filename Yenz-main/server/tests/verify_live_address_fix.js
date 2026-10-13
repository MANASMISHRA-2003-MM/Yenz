const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

async function testLiveAddressFix() {
  console.log('--- STARTING VERIFICATION OF LIVE CUSTOMER ADDRESS FIX ---');

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_key';

  // 1. Get test customer and test driver
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  const driver = await prisma.user.findFirst({ where: { role: 'DELIVERY_PARTNER' } });
  const vendor = await prisma.vendor.findFirst();

  if (!customer || !driver || !vendor) {
    throw new Error('Required test users (customer, driver, vendor) not found in database');
  }

  const customerToken = jwt.sign({ id: customer.id, role: customer.role }, JWT_SECRET, { expiresIn: '1h' });
  const driverToken = jwt.sign({ id: driver.id, role: driver.role }, JWT_SECRET, { expiresIn: '1h' });

  // Ensure cart has at least 1 item for customer
  let cart = await prisma.cart.findFirst({
    where: { userId: customer.id, cartType: 'CRAVINGS' },
    include: { CartItem: true }
  });

  const product = await prisma.product.findFirst({ where: { vendorId: vendor.id } });
  if (!product) throw new Error('No product found for vendor');

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: customer.id,
        vendorId: vendor.id,
        cartType: 'CRAVINGS'
      }
    });
  }

  // Clear and add item
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    }
  });

  // 2. Submit order with LIVE FARIDABAD GPS address (NOT Noida!)
  const liveAddress = {
    title: 'Live GPS Location 📍',
    street: 'House 552, Sector 21D, Market Area',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121001',
    latitude: 28.4089,
    longitude: 77.3178
  };

  console.log('\n[Step 1] Placing order via POST /api/orders with live GPS coordinates:');
  console.log(`- Street: ${liveAddress.street}`);
  console.log(`- City: ${liveAddress.city}`);
  console.log(`- Coordinates: Lat ${liveAddress.latitude}, Lng ${liveAddress.longitude}`);

  const createRes = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      address: liveAddress,
      paymentMethod: 'COD',
      deliveryNotes: 'Please ring bell',
      shoppingMode: 'CRAVINGS'
    })
  });

  const createData = await createRes.json();
  if (!createData.success || !createData.order) {
    throw new Error(`Order creation failed: ${createData.message}`);
  }

  const orderId = createData.order.id || createData.order._id;
  const orderNumber = createData.order.orderNumber;
  console.log(`✅ Order placed successfully: #${orderNumber} (id: ${orderId})`);

  // Verify created order in database directly
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { Address: true, Vendor: true }
  });

  console.log('\n[Step 2] Verifying database persistence for Order and Address:');
  console.log(`- Order dropLat: ${dbOrder.dropLat}, dropLng: ${dbOrder.dropLng}`);
  console.log(`- Linked Address: ${dbOrder.Address?.addressLine}, ${dbOrder.Address?.city}`);
  console.log(`- Address coords: Lat ${dbOrder.Address?.latitude}, Lng ${dbOrder.Address?.longitude}`);

  if (Number(dbOrder.dropLat) !== 28.4089 || Number(dbOrder.dropLng) !== 77.3178) {
    throw new Error(`dropLat/dropLng mismatch! Expected 28.4089, 77.3178 but got ${dbOrder.dropLat}, ${dbOrder.dropLng}`);
  }
  if (!dbOrder.Address?.addressLine.includes('Sector 21D')) {
    throw new Error(`Address line not updated! Got ${dbOrder.Address?.addressLine}`);
  }
  if (dbOrder.Address?.city !== 'Faridabad') {
    throw new Error(`Address city not Faridabad! Got ${dbOrder.Address?.city}`);
  }
  console.log('✅ Order and Address correctly stored with live customer location in DB!');

  // 3. Driver accepts order via PUT /api/orders/:id/accept-job
  console.log('\n[Step 3] Driver accepts delivery job...');
  const acceptRes = await fetch(`http://localhost:5000/api/orders/${orderId}/accept-job`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const acceptData = await acceptRes.json();
  if (!acceptData.success) {
    throw new Error(`Accept job failed: ${acceptData.message}`);
  }
  console.log('✅ Driver accepted delivery job.');

  // 4. Verify Driver Dashboard (GET /api/deliveries/dashboard)
  console.log('\n[Step 4] Checking Delivery Dashboard for Driver:');
  const dashRes = await fetch('http://localhost:5000/api/deliveries/dashboard', {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const dashData = await dashRes.json();
  const activeDelivery = dashData.activeDelivery;

  if (!activeDelivery) {
    throw new Error('No active delivery found on driver dashboard!');
  }

  console.log(`- Driver activeDelivery ID: ${activeDelivery.orderNumber || activeDelivery.orderId}`);
  console.log(`- Customer name: ${activeDelivery.customer?.name}`);
  console.log(`- Customer drop location name: ${activeDelivery.customerLocationName}`);
  console.log(`- Customer Address Object:`, activeDelivery.customerAddress);
  console.log(`- Dropoff Coordinates for navigation: Lat ${activeDelivery.dropLat}, Lng ${activeDelivery.dropLng}`);

  if (Number(activeDelivery.dropLat) !== 28.4089 || Number(activeDelivery.dropLng) !== 77.3178) {
    throw new Error(`Driver dashboard drop coordinates mismatch! Got ${activeDelivery.dropLat}, ${activeDelivery.dropLng}`);
  }

  if (activeDelivery.customerAddress?.city !== 'Faridabad' || !activeDelivery.customerAddress?.addressLine.includes('Sector 21D')) {
    throw new Error(`Driver dashboard address mismatch! Got ${JSON.stringify(activeDelivery.customerAddress)}`);
  }

  // Ensure NO Noida fallback
  if (String(activeDelivery.customerLocationName).includes('Noida') || String(activeDelivery.customerAddress?.addressLine).includes('Lotus Greens')) {
    throw new Error('Driver is still seeing Noida Sector 106 or Lotus Greens!');
  }

  console.log('✅ Driver dashboard displays the EXACT customer live location in Faridabad!');

  // 5. Cleanup test order
  console.log('\n[Step 5] Cleaning up test order...');
  await prisma.delivery.deleteMany({ where: { orderId } });
  await prisma.orderTimeline.deleteMany({ where: { orderId } });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.payment.deleteMany({ where: { orderId } });
  await prisma.order.delete({ where: { id: orderId } });
  if (dbOrder.addressId) {
    await prisma.address.delete({ where: { id: dbOrder.addressId } }).catch(() => {});
  }
  console.log('✅ Cleanup complete.');

  console.log('\n🎉 ALL LIVE CUSTOMER ADDRESS TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testLiveAddressFix().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
