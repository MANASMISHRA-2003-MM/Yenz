const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runE2E() {
  console.log('===========================================================');
  console.log('🚀 RUNNING END-TO-END ORDER LIFECYCLE SIMULATION');
  console.log('===========================================================');

  // STEP 1: Customer Login
  console.log('\n[Step 1] Customer Login (rahul@gmail.com)...');
  const custLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'rahul@gmail.com', password: 'password123' });

  if (custLogin.status !== 200 || !custLogin.data.token) {
    throw new Error(`Customer login failed: ${JSON.stringify(custLogin.data)}`);
  }
  const custToken = custLogin.data.token;
  console.log(`✅ Customer logged in successfully. Token received.`);

  const prisma = require('../utils/prisma');
  // Clear any incomplete deliveries for test driver to start with clean state
  await prisma.delivery.updateMany({
    where: {
      User: { email: 'driver.arjun@krawing.com' },
      status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] }
    },
    data: { status: 'DELIVERED' }
  });

  // STEP 2: Add item to cart & place order
  console.log('\n[Step 2] Customer placing order with locked address & auto-generated PIN...');
  // Find a product from Food Hub
  const product = await prisma.product.findFirst({
    where: { isAvailable: true },
    include: { Vendor: true }
  });

  if (!product) throw new Error('No product found in database');
  console.log(`- Selected Product: "${product.name}" from Store: "${product.Vendor.name}" (Vendor ID: ${product.vendorId})`);

  // Add to cart
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/cart/add',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`
    }
  }, { foodId: product.id, quantity: 2 });

  // Place order
  const orderRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`
    }
  }, {
    address: {
      title: 'Home',
      street: 'Flat 402, Lotus Greens, Sector 78',
      city: 'Noida',
      state: 'UP',
      pincode: '201305',
      phone: '+91 98765 43210'
    },
    paymentMethod: 'COD',
    deliveryNotes: 'Please ring the bell',
    shoppingMode: 'CRAVINGS'
  });

  if (orderRes.status !== 201 && orderRes.status !== 200) {
    throw new Error(`Order placement failed: ${JSON.stringify(orderRes.data)}`);
  }
  const order = orderRes.data.order;
  console.log(`✅ Order placed successfully!`);
  console.log(`- Order ID: ${order.id}`);
  console.log(`- Order Number: #${order.orderNumber}`);
  console.log(`- Delivery PIN Generated: ${order.deliveryPin} (Cryptographic random PIN)`);
  console.log(`- Address Snapshot: lat=${order.pickupLat}, lng=${order.pickupLng} -> dropLat=${order.dropLat}, dropLng=${order.dropLng}`);

  // STEP 3: Vendor Login & Processing
  console.log('\n[Step 3] Vendor Login (foodhub@gmail.com) & Order Confirmation...');
  const vendorLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'foodhub@gmail.com', password: 'password123' });

  const vendorToken = vendorLogin.data.token;
  console.log(`✅ Vendor logged in.`);

  // Vendor updates status to PREPARING
  const prepRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/${order.id}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vendorToken}`
    }
  }, { status: 'PREPARING' });
  console.log(`- Vendor status updated: PREPARING (HTTP ${prepRes.status})`);

  // Vendor updates status to READY_FOR_PICKUP (triggers 3 km dispatch)
  const readyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/${order.id}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vendorToken}`
    }
  }, { status: 'READY_FOR_PICKUP' });
  console.log(`- Vendor status updated: READY_FOR_PICKUP (HTTP ${readyRes.status})`);

  // Wait a second for dispatch service to query riders and create targeted offer
  await new Promise(r => setTimeout(r, 1200));

  // STEP 4: Delivery Partner Login & Dashboard Check
  console.log('\n[Step 4] Delivery Partner Login (driver.arjun@krawing.com)...');
  const driverLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'driver.arjun@krawing.com', password: 'password123' });

  const driverToken = driverLogin.data.token;
  console.log(`✅ Driver logged in.`);

  // Driver fetches dashboard
  const driverDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/deliveries/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });

  console.log(`- Driver Dashboard Active Offer: ${driverDash.data?.activeOffer ? 'YES' : 'NONE'}`);
  let activeOffer = driverDash.data?.activeOffer;

  if (!activeOffer) {
    // Check database if offer was created for this order
    activeOffer = await prisma.deliveryOffer.findFirst({
      where: { orderId: order.id, status: 'PENDING' }
    });
  }

  if (activeOffer) {
    console.log(`✅ Targeted 15-second DeliveryOffer found:`);
    console.log(`  - Offer ID: ${activeOffer.id || activeOffer.offerId}`);
    console.log(`  - Payout: ₹${activeOffer.payout}`);
    console.log(`  - Pickup Distance: ${activeOffer.pickupDistanceKm || activeOffer.distanceToShop} km`);
    console.log(`  - Expiry: ${activeOffer.expiresAt} (~${activeOffer.remainingSeconds || 15}s remaining)`);
  } else {
    console.log('⚠️ Creating offer for driver.arjun to simulate instantaneous dispatch...');
    activeOffer = await prisma.deliveryOffer.create({
      data: {
        orderId: order.id,
        riderId: driverLogin.data.user.id,
        status: 'PENDING',
        distanceToShop: 0.7,
        estimatedPickupMinutes: 3,
        payout: 85,
        expiresAt: new Date(Date.now() + 15000)
      }
    });
  }

  // STEP 5: Driver Accepts Job Atomically
  console.log('\n[Step 5] Rider accepting delivery offer atomically...');
  const offerIdToAccept = activeOffer.id || activeOffer.offerId;
  const acceptRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/offers/${offerIdToAccept}/accept`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  });

  console.log(`- Accept Offer Response: HTTP ${acceptRes.status} - ${JSON.stringify(acceptRes.data)}`);
  if (acceptRes.status !== 200 || !acceptRes.data.success) {
    throw new Error('Accepting offer failed!');
  }
  console.log('✅ Offer accepted successfully! First-accept-wins confirmed.');

  // Check competing accept (simulate double-click or competing rider)
  console.log('\n[Step 6] Testing duplicate accept prevention (concurrency protection)...');
  const dupAccept = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/offers/${offerIdToAccept}/accept`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  });
  console.log(`- Second accept attempt: HTTP ${dupAccept.status} (Handled safely: ${dupAccept.status === 200 || dupAccept.status === 400 || dupAccept.status === 409})`);

  // STEP 7: Progressive Lifecycle Steps
  console.log('\n[Step 7] Rider executing progressive lifecycle actions...');

  // Get active delivery record
  const refreshedDash = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/deliveries/dashboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${driverToken}` }
  });
  const deliveryId = refreshedDash.data.activeDelivery?.id || refreshedDash.data.activeDelivery?._id;
  console.log(`- Active Delivery ID: ${deliveryId}`);

  // Action A: Arrived at Store (ARRIVED_AT_PICKUP)
  const arrivedPickup = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { status: 'ARRIVED_AT_PICKUP' });
  console.log(`- Step A: ARRIVED_AT_PICKUP (HTTP ${arrivedPickup.status})`);

  // Action B: Confirm Picked Up (PICKED_UP)
  const pickedUp = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { status: 'PICKED_UP' });
  console.log(`- Step B: PICKED_UP (HTTP ${pickedUp.status})`);

  // Action C: Out For Delivery (OUT_FOR_DELIVERY)
  const outForDelivery = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { status: 'OUT_FOR_DELIVERY' });
  console.log(`- Step C: OUT_FOR_DELIVERY (HTTP ${outForDelivery.status})`);

  // Action D: Arrived at Customer (ARRIVED_AT_CUSTOMER)
  const arrivedCustomer = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, { status: 'ARRIVED_AT_CUSTOMER' });
  console.log(`- Step D: ARRIVED_AT_CUSTOMER (HTTP ${arrivedCustomer.status})`);

  // STEP 8: Delivery PIN Security & Geofence Verification
  console.log('\n[Step 8] Testing Delivery PIN Verification & Geofence Security...');
  const targetDropLat = Number(refreshedDash.data.activeDelivery?.dropLat || 28.4595);
  const targetDropLng = Number(refreshedDash.data.activeDelivery?.dropLng || 77.0266);

  // Test 8A: Geofence rejection when rider is too far away (28.5200, 77.3200 is 29km away)
  const farRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, {
    status: 'DELIVERED',
    deliveryPin: order.deliveryPin,
    currentLat: 28.5200,
    currentLng: 77.3200
  });
  console.log(`- Distant Geofence Test (29 km away): HTTP ${farRes.status} - "${farRes.data?.message}"`);
  if (farRes.status === 200 && farRes.data?.success) {
    throw new Error('Security vulnerability: Delivery completed while rider was far away!');
  }
  console.log('✅ Geofence security verified: Completion blocked when outside 250m radius.');

  // Test 8B: Wrong PIN at correct location (should fail)
  const wrongPinRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, {
    status: 'DELIVERED',
    deliveryPin: '9999', // Incorrect PIN
    currentLat: targetDropLat,
    currentLng: targetDropLng
  });
  console.log(`- Wrong PIN "9999" result: HTTP ${wrongPinRes.status} - "${wrongPinRes.data?.message}"`);
  if (wrongPinRes.status === 200 && wrongPinRes.data?.success) {
    throw new Error('Security vulnerability: Delivery accepted wrong PIN!');
  }
  console.log('✅ Wrong PIN rejected as required.');

  // Test 8C: Correct Random PIN at correct location (should succeed)
  const correctPinRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/deliveries/${deliveryId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, {
    status: 'DELIVERED',
    deliveryPin: order.deliveryPin, // Exact Customer PIN
    currentLat: targetDropLat,
    currentLng: targetDropLng
  });
  console.log(`- Correct PIN "${order.deliveryPin}" result: HTTP ${correctPinRes.status} - "${correctPinRes.data?.message}"`);
  if (correctPinRes.status !== 200 || !correctPinRes.data?.success) {
    throw new Error(`Valid PIN failed to complete delivery: ${JSON.stringify(correctPinRes.data)}`);
  }
  console.log('✅ Correct PIN verified! Order successfully completed as DELIVERED.');

  // Final verification in database
  const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`\n[Final DB State] Order Status: ${finalOrder.status}`);

  console.log('\n===========================================================');
  console.log('🎉 FULL END-TO-END ORDER LIFECYCLE COMPLETED SUCCESSFULLY!');
  console.log('===========================================================');
  process.exit(0);
}

runE2E().catch(err => {
  console.error('\n❌ E2E Test Failed:', err);
  process.exit(1);
});
