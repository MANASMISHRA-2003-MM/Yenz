const prisma = require('../utils/prisma');

async function fixProductCatalog() {
  console.log('--- FIXING PRODUCT CATALOG ISOLATION ---');

  // 1. All products belonging to CRAVINGS vendors (Restaurants) MUST have productType = 'FOOD'
  const cravingsVendors = await prisma.vendor.findMany({
    where: { vendorType: 'CRAVINGS' },
    select: { id: true, name: true }
  });

  const cravingsVendorIds = cravingsVendors.map(v => v.id);

  const updatedCravingsProducts = await prisma.product.updateMany({
    where: { vendorId: { in: cravingsVendorIds } },
    data: { productType: 'FOOD' }
  });

  console.log(`✅ Updated ${updatedCravingsProducts.count} restaurant dishes to productType = 'FOOD' for CRAVINGS vendors.`);

  // 2. All products belonging to FRESH vendors (Mandi / Grocery Stores) MUST have productType in ('VEGETABLE', 'FRUIT', 'GROCERY')
  const freshVendors = await prisma.vendor.findMany({
    where: { vendorType: 'FRESH' },
    select: { id: true, name: true }
  });

  const freshVendorIds = freshVendors.map(v => v.id);

  const updatedFreshProducts = await prisma.product.updateMany({
    where: {
      vendorId: { in: freshVendorIds },
      productType: 'FOOD'
    },
    data: { productType: 'VEGETABLE' }
  });

  console.log(`✅ Updated ${updatedFreshProducts.count} produce items to productType = 'VEGETABLE' for FRESH vendors.`);

  console.log('🎉 PRODUCT CATALOG ISOLATION FIXED SUCCESSFULLY!');
}

fixProductCatalog()
  .catch(err => {
    console.error('❌ Error fixing product catalog:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
