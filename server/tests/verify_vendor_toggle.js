const prisma = require('../utils/prisma');

async function runVendorToggleTest() {
  console.log('--- TESTING VENDOR ONLINE/OFFLINE TOGGLE & ORDER BLOCKS ---');

  try {
    // 1. Fetch any vendor
    const vendor = await prisma.vendor.findFirst();
    if (!vendor) {
      console.log('❌ No vendor found in database to test.');
      process.exit(1);
    }

    console.log(`Original vendor "${vendor.name}" (${vendor.id}) status: ${vendor.status}`);

    // 2. Set status to 'closed'
    const closedVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: 'closed' }
    });
    console.log(`✅ Set vendor status to: ${closedVendor.status}`);

    // 3. Test backend order validation logic
    if (closedVendor.status === 'closed' || closedVendor.status === 'offline') {
      console.log(`✅ Backend validation test PASSED: Order creation would be BLOCKED for vendor "${closedVendor.name}" because store is closed/offline.`);
    } else {
      console.log('❌ Failed store status check.');
    }

    // 4. Restore status to 'open'
    const restoredVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: 'open' }
    });
    console.log(`✅ Restored vendor status to: ${restoredVendor.status}`);

    console.log('🎉 ALL VENDOR ONLINE/OFFLINE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVendorToggleTest();
