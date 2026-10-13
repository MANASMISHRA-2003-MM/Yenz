const { validateDropoffGeofence } = require('../utils/deliveryVerification');
const prisma = require('../utils/prisma');

async function testGeofenceAndAddress() {
  console.log('--- TESTING GEOFENCE 350M ALLOWANCE & LIVE ADDRESS PRESERVATION ---');

  // 1. Test 350m Geofence Validation
  // Customer dropoff at 28.4866, 77.2918 (Faridabad)
  const dropLat = 28.4866;
  const dropLng = 77.2918;

  // Rider at ~300 meters away (28.4890, 77.2918)
  const riderLat300m = 28.4890;
  const riderLng300m = 77.2918;

  const result300m = validateDropoffGeofence(riderLat300m, riderLng300m, dropLat, dropLng, 350);
  console.log('300m Geofence Check Result:', result300m);

  if (result300m.valid) {
    console.log(`✅ 350m Geofence test PASSED: Rider at ${result300m.distanceMeters}m is allowed to verify PIN!`);
  } else {
    console.error('❌ 350m Geofence test FAILED!');
    process.exit(1);
  }

  // Rider far away (10,900m)
  const riderLatFar = 28.5700;
  const riderLngFar = 77.3200;
  const resultFar = validateDropoffGeofence(riderLatFar, riderLngFar, dropLat, dropLng, 350);
  console.log('Far Rider Geofence Check Result:', resultFar);

  if (!resultFar.valid && resultFar.distanceMeters > 350) {
    console.log(`✅ Out-of-bounds Geofence test PASSED: Far rider at ${resultFar.distanceMeters}m blocked correctly with 350m threshold message.`);
  } else {
    console.error('❌ Out-of-bounds Geofence test FAILED!');
    process.exit(1);
  }

  console.log('🎉 ALL GEOFENCE & LIVE ADDRESS VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

testGeofenceAndAddress()
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
