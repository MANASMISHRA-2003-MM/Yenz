const prisma = require('../utils/prisma');

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Order" 
      ADD COLUMN IF NOT EXISTS "vendorHandoverPhoto" TEXT,
      ADD COLUMN IF NOT EXISTS "riderDeliveryPhoto" TEXT;
    `);
    console.log('✅ Added vendorHandoverPhoto and riderDeliveryPhoto to Order table in PostgreSQL.');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Delivery" 
      ADD COLUMN IF NOT EXISTS "vendorHandoverPhoto" TEXT,
      ADD COLUMN IF NOT EXISTS "riderDeliveryPhoto" TEXT;
    `);
    console.log('✅ Added vendorHandoverPhoto and riderDeliveryPhoto to Delivery table in PostgreSQL.');
  } catch (err) {
    console.error('Error executing alter table:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
