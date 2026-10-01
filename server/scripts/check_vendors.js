require('dotenv').config();
const prisma = require('../utils/prisma');

async function main() {
  const vendors = await prisma.vendor.findMany();
  console.log('Total Vendors in DB:', vendors.length);
  vendors.forEach(v => {
    console.log(`ID: ${v.id} | Name: ${v.name} | Type: ${v.vendorType} | Status: ${v.status} | Lat: ${v.latitude} | Lng: ${v.longitude}`);
  });
  
  const cravings = vendors.filter(v => v.vendorType === 'CRAVINGS');
  const fresh = vendors.filter(v => v.vendorType === 'FRESH');
  console.log(`Cravings count: ${cravings.length}, Fresh count: ${fresh.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
