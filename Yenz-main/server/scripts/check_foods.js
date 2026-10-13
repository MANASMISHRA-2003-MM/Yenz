require('dotenv').config();
const prisma = require('../utils/prisma');

async function main() {
  const foods = await prisma.product.findMany({
    include: { Vendor: true }
  });
  console.log('Total Foods in DB:', foods.length);
  foods.forEach(f => {
    console.log(`Food: "${f.name}" | Vendor: "${f.Vendor?.name}" (${f.Vendor?.vendorType}) | Type: ${f.productType}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
