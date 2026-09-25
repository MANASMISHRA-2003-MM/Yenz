const prisma = require('../utils/prisma');

async function fixCartIndexes() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE lower(tablename) = 'cart';
    `);
    
    // Drop any single-column unique index on userId if it exists
    for (const idx of indexes) {
      if (idx.indexdef.includes('UNIQUE') && idx.indexdef.includes('"userId"') && !idx.indexdef.includes('"cartType"')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "${idx.indexname}" CASCADE;`);
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx.indexname}" CASCADE;`);
      }
    }

    // Ensure composite index exists
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_user_cart_type" 
      ON "Cart" ("userId", "cartType");
    `);

    const updatedIndexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE lower(tablename) = 'cart';
    `);
    
    console.log('SUCCESS_INDEXES_FIXED:', JSON.stringify(updatedIndexes, null, 2));
  } catch (err) {
    console.error('ERROR_FIXING_INDEXES:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

fixCartIndexes();
