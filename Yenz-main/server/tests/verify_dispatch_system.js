const prisma = require('../utils/prisma');
const { calculateDistance } = require('../socket/socketHandler');
const { calculateDeliveryPayout } = require('../utils/payoutCalculator');
const { dispatchOrder, acceptOffer, rejectOffer } = require('../services/dispatchService');

async function testDispatchSystem() {
  console.log('--- STARTING VERIFICATION TEST OF 3 KM DISPATCH & ATOMIC RINGING ---');

  // 1. Payout Calculator Test
  console.log('\n[Test 1] Testing unified payout calculator...');
  const payout1km = calculateDeliveryPayout(1.0);
  const payout3km = calculateDeliveryPayout(3.0);
  console.log(`- 1.0 km payout: ₹${payout1km} (Formula: 35 + 20*1 + 15 = 70)`);
  console.log(`- 3.0 km payout: ₹${payout3km} (Formula: 35 + 20*3 + 15 = 110)`);
  if (payout1km !== 70 || payout3km !== 110) {
    throw new Error('Payout calculation mismatch!');
  }
  console.log('✅ Payout calculator matches exact formula.');

  // 2. Distance Verification (Haversine 3 km boundary)
  console.log('\n[Test 2] Testing 3 km Haversine distance filtering...');
  const shopLat = 28.5000;
  const shopLng = 77.3000;
  const riderA = { lat: 28.5050, lng: 77.3050 }; // ~0.74 km
  const riderFar = { lat: 28.5500, lng: 77.3500 }; // ~7.3 km

  const distA = calculateDistance(riderA.lat, riderA.lng, shopLat, shopLng);
  const distFar = calculateDistance(riderFar.lat, riderFar.lng, shopLat, shopLng);
  console.log(`- Rider A distance to Shop: ${distA} km (Eligible: ${distA <= 3.0})`);
  console.log(`- Rider Far distance to Shop: ${distFar} km (Eligible: ${distFar <= 3.0})`);

  if (distA > 3.0 || distFar <= 3.0) {
    throw new Error('Distance filter boundary error');
  }
  console.log('✅ 3 km geographic boundary check passed.');

  // 3. Find test vendor, customer, and delivery riders in DB
  console.log('\n[Test 3] Verifying database records & models...');
  const vendor = await prisma.vendor.findFirst({
    where: { latitude: { not: null }, longitude: { not: null } }
  });
  if (!vendor) {
    console.warn('⚠️ No vendor with coordinates found. Setting test vendor coordinates...');
    const anyVendor = await prisma.vendor.findFirst();
    if (anyVendor) {
      await prisma.vendor.update({
        where: { id: anyVendor.id },
        data: { latitude: 28.5000, longitude: 77.3000 }
      });
    }
  }

  const driverUser = await prisma.user.findFirst({
    where: { role: 'DELIVERY_PARTNER' }
  });
  console.log(`- Found delivery partner in DB: ${driverUser ? driverUser.email : 'None'}`);

  if (driverUser) {
    // Ensure rider is online and has fresh GPS
    await prisma.user.update({
      where: { id: driverUser.id },
      data: { isOnline: true, status: 'active' }
    });
    await prisma.riderLocation.upsert({
      where: { riderId: driverUser.id },
      update: { latitude: 28.5050, longitude: 77.3050, updatedAt: new Date() },
      create: { riderId: driverUser.id, latitude: 28.5050, longitude: 77.3050 }
    });
    console.log('✅ Updated test rider to ONLINE with fresh GPS at (28.5050, 77.3050).');
  }

  // 4. Test DeliveryOffer creation, atomic accept, and competing offer cancellation
  console.log('\n[Test 4] Testing atomic DeliveryOffer acceptance and competing offer cancellation...');
  
  // Clear any active deliveries for driverUser so he is available
  await prisma.delivery.updateMany({
    where: { deliveryPartnerId: driverUser.id, status: { in: ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } },
    data: { status: 'DELIVERED' }
  });

  const testCustomer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });

  // Create isolated fresh test order with vendorUserId: null
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: `TEST-ORD-${Date.now()}`,
      customerId: testCustomer ? testCustomer.id : driverUser.id,
      vendorId: vendor ? vendor.id : null,
      vendorUserId: null,
      deliveryPartnerId: null,
      status: 'CONFIRMED',
      subtotal: 200,
      totalAmount: 250,
      pickupLat: 28.5000,
      pickupLng: 77.3000,
      dropLat: 28.5200,
      dropLng: 77.3200,
      deliveryPin: '4821'
    }
  });

  // Create Rider A offer (driverUser)
  const offerA = await prisma.deliveryOffer.create({
    data: {
      orderId: testOrder.id,
      riderId: driverUser.id,
      status: 'PENDING',
      distanceToShop: 0.8,
      estimatedPickupMinutes: 3,
      payout: 85,
      expiresAt: new Date(Date.now() + 15000)
    }
  });

  // Create Rider B competing offer
  const testDriverB = await prisma.user.findFirst({
    where: { role: 'DELIVERY_PARTNER', id: { not: driverUser.id } }
  });

  let offerB = null;
  if (testDriverB) {
    offerB = await prisma.deliveryOffer.create({
      data: {
        orderId: testOrder.id,
        riderId: testDriverB.id,
        status: 'PENDING',
        distanceToShop: 1.4,
        estimatedPickupMinutes: 5,
        payout: 85,
        expiresAt: new Date(Date.now() + 15000)
      }
    });
  }

  console.log(`- Created Offer A (${offerA.id}) and Competing Offer B (${offerB ? offerB.id : 'N/A'})`);

  // Rider A accepts offer atomically
  const acceptResult = await acceptOffer(offerA.id, driverUser.id);
  console.log(`- Accept offer result: ${acceptResult.success ? 'SUCCESS' : 'FAILED'} - ${acceptResult.message}`);

  if (!acceptResult.success) {
    throw new Error(`Accept offer failed: ${acceptResult.message}`);
  }

  // Verify Rider A offer is ACCEPTED
  const updatedOfferA = await prisma.deliveryOffer.findUnique({ where: { id: offerA.id } });
  console.log(`- Offer A status: ${updatedOfferA.status} (Expected: ACCEPTED)`);
  if (updatedOfferA.status !== 'ACCEPTED') {
    throw new Error('Offer A status should be ACCEPTED');
  }

  // Verify Competing Offer B was CANCELLED
  if (offerB) {
    const updatedOfferB = await prisma.deliveryOffer.findUnique({ where: { id: offerB.id } });
    console.log(`- Competing Offer B status: ${updatedOfferB.status} (Expected: CANCELLED)`);
    if (updatedOfferB.status !== 'CANCELLED') {
      throw new Error('Competing Offer B should have been automatically CANCELLED');
    }
  }

  // Verify Order assignment
  const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
  console.log(`- Order assigned rider: ${updatedOrder.deliveryPartnerId || updatedOrder.vendorUserId} (Expected: ${driverUser.id})`);
  if ((updatedOrder.deliveryPartnerId || updatedOrder.vendorUserId) !== driverUser.id) {
    throw new Error('Order deliveryPartnerId was not atomically assigned to Rider A');
  }

  // Try second acceptance by another rider (should be blocked by first-accept-wins)
  console.log('\n[Test 5] Testing atomic protection against duplicate acceptance...');
  if (offerB && testDriverB) {
    const duplicateResult = await acceptOffer(offerB.id, testDriverB.id);
    console.log(`- Competing Rider B accept attempt: ${duplicateResult.success ? 'ACCEPTED' : 'BLOCKED'} (Status: ${duplicateResult.statusCode})`);
    if (duplicateResult.success) {
      throw new Error('Competing offer should not have been allowed to accept');
    }
    console.log(`✅ Atomic conditional check prevented duplicate acceptance: "${duplicateResult.message}"`);
  }

  // Clean up test order and offers
  await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
  await prisma.deliveryOffer.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
  await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
  console.log('✅ Cleaned up test records.');

  console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

testDispatchSystem().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
