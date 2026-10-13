const prisma = require('../utils/prisma');

const RESTAURANT_IMAGES = {
  'jai bharat': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  'rediwala': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  'khadak singh': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800',
  'faruk shawarma': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800',
  'daily dose': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
  'jai jagannath': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&q=80&w=800',
  'bikaner': 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=800',
  'mandi': 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800'
};

const DEFAULT_RESTAURANT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800';

const PRODUCT_IMAGE_MAP = {
  momo: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&q=80&w=800',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&q=80&w=800',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=800',
  chowmein: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
  shawarma: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800',
  sweet: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=800',
  tamatar: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
  apple: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=800',
  palak: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
  spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
  aloo: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800'
};

const DEFAULT_FOOD = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
const DEFAULT_FRESH = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';

async function main() {
  console.log('Updating database vendor & product images with live Unsplash URLs...');

  const vendors = await prisma.vendor.findMany();
  for (const v of vendors) {
    let img = DEFAULT_RESTAURANT;
    const nameLower = v.name.toLowerCase();
    for (const [k, url] of Object.entries(RESTAURANT_IMAGES)) {
      if (nameLower.includes(k)) {
        img = url;
        break;
      }
    }
    await prisma.vendor.update({
      where: { id: v.id },
      data: { image: img, bannerImage: img }
    });
    console.log(`Updated Vendor [${v.name}] -> ${img}`);
  }

  const products = await prisma.product.findMany();
  for (const p of products) {
    let img = p.productType === 'FRESH' ? DEFAULT_FRESH : DEFAULT_FOOD;
    const q = `${p.name} ${p.category || ''}`.toLowerCase();
    for (const [k, url] of Object.entries(PRODUCT_IMAGE_MAP)) {
      if (q.includes(k)) {
        img = url;
        break;
      }
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { image: img }
    });
    console.log(`Updated Product [${p.name}] -> ${img}`);
  }

  console.log('Successfully updated all database images!');
}

main()
  .catch(err => {
    console.error('Error updating DB images:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
