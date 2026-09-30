const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

async function updateSonyDhabha() {
  console.log('🔄 Updating Sony Dhabha in Aiven PostgreSQL Database...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const email = 'sony@krawing.com';

  // 1. Create or update the Vendor User
  let vendorUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!vendorUser) {
    console.log('Creating new Vendor User for sony@krawing.com...');
    vendorUser = await prisma.user.create({
      data: {
        fullName: 'Sony Dhabha Owner',
        email,
        phone: '7390882890',
        passwordHash,
        role: 'VENDOR',
        status: 'active',
        isOnline: true,
        avatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=200'
      }
    });
    console.log('✅ Vendor User created with ID:', vendorUser.id);
  } else {
    console.log('Updating existing User sony@krawing.com...');
    vendorUser = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: 'VENDOR',
        status: 'active',
        isOnline: true
      }
    });
    console.log('✅ Vendor User updated with ID:', vendorUser.id);
  }

  // 2. Find Sony Dhabha vendor (by ID or name)
  let vendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        { id: 'baa0d9ce-0350-45e4-ad4b-9e13240a8a90' },
        { name: { contains: 'Sony', mode: 'insensitive' } }
      ]
    }
  });

  const latitude = 28.4572200;
  const longitude = 77.4972200;

  if (vendor) {
    console.log(`Found existing vendor "${vendor.name}" (${vendor.id}). Updating location and credentials...`);
    vendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ownerUserId: vendorUser.id,
        email: email,
        vendorType: 'CRAVINGS',
        latitude: latitude,
        longitude: longitude,
        status: 'open'
      }
    });
    console.log('✅ Sony Dhabha updated successfully:');
    console.log({
      id: vendor.id,
      name: vendor.name,
      vendorType: vendor.vendorType,
      ownerUserId: vendor.ownerUserId,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      latitude: vendor.latitude,
      longitude: vendor.longitude
    });
  } else {
    console.log('Creating new Sony Dhabha vendor...');
    vendor = await prisma.vendor.create({
      data: {
        ownerUserId: vendorUser.id,
        vendorType: 'CRAVINGS',
        name: 'Sony Dhabha',
        phone: '7390882896',
        email: email,
        address: 'Knowledge park 2, Greater Noida',
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        latitude: latitude,
        longitude: longitude,
        rating: 4.5,
        numRatings: 100,
        deliveryTime: '25-35 min',
        deliveryFee: 30.00,
        priceRange: '₹₹',
        isVegOnly: false,
        status: 'open',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
        bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200'
      }
    });
    console.log('✅ Sony Dhabha created with ID:', vendor.id);
  }

  // Verification: Test authentication
  const isPasswordValid = await bcrypt.compare('password123', vendorUser.passwordHash);
  console.log('🔑 Authentication verification (password123):', isPasswordValid ? 'SUCCESS' : 'FAILED');
}

updateSonyDhabha()
  .catch((err) => {
    console.error('❌ Error updating Sony Dhabha:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
