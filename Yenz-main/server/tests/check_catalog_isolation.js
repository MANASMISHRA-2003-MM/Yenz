const prisma = require('../utils/prisma');

async function checkCatalog() {
  console.log('--- CHECKING VENDORS & PRODUCTS ISOLATION ---');

  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, vendorType: true }
  });

  console.log(`Found ${vendors.length} vendors in DB:`);
  vendors.forEach(v => {
    console.log(` - Store: "${v.name}" (${v.id}) | type: ${v.vendorType}`);
  });

  const products = await prisma.product.findMany({
    include: { Vendor: true }
  });

  console.log(`\nFound ${products.length} products in DB:`);
  products.forEach(p => {
    console.log(` - Product: "${p.name}" | productType: ${p.productType} | Vendor: "${p.Vendor?.name}" (${p.Vendor?.vendorType})`);
  });
}

checkCatalog();
