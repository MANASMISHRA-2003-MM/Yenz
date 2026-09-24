const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const prisma = require('./prisma');

dotenv.config();

const seedData = async () => {
  try {
    console.log('🔥 RESETTING POSTGRESQL DATABASE VIA PRISMA FOR UNIFIED KRAWING SYSTEM...');

    // Delete in reverse order of foreign key dependencies
    await prisma.notification.deleteMany({});
    await prisma.couponUsage.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.deliveryLocation.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.orderTimeline.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.vendorHours.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash('password123', 10);

    console.log('1️⃣ Seeding Unified Users (Consumers, Vendors, Drivers, Admins)...');

    // Customers
    const userRahul = await prisma.user.create({
      data: { fullName: 'Rahul Sharma', email: 'rahul@gmail.com', phone: '9876543210', passwordHash, role: 'CUSTOMER', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200' }
    });
    const userAman = await prisma.user.create({
      data: { fullName: 'Aman Verma', email: 'aman@gmail.com', phone: '9876543211', passwordHash, role: 'CUSTOMER', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200' }
    });
    const userPriya = await prisma.user.create({
      data: { fullName: 'Priya Singh', email: 'priya@gmail.com', phone: '9876543212', passwordHash, role: 'CUSTOMER', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' }
    });

    // Admins
    const adminSuper = await prisma.user.create({
      data: { fullName: 'Super Admin - Ankit', email: 'admin@krawing.com', phone: '+919000000001', passwordHash, role: 'ADMIN', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }
    });

    // Delivery Partners
    const driverArjun = await prisma.user.create({
      data: { fullName: 'Arjun Delivery Partner', email: 'driver.arjun@krawing.com', phone: '9000000002', passwordHash, role: 'DELIVERY_PARTNER', vehicleType: 'Bike', ratings: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
    });

    // Vendor User Owners
    const vUser1 = await prisma.user.create({ data: { fullName: 'Vikas Mehta (Food Hub)', email: 'foodhub@gmail.com', phone: '9811111111', passwordHash, role: 'VENDOR' } });
    const vUser2 = await prisma.user.create({ data: { fullName: 'Owner - Rediwala Junction', email: 'rediwala@krawing.com', phone: '8383892804', passwordHash, role: 'VENDOR' } });
    const vUser3 = await prisma.user.create({ data: { fullName: 'Owner - Jai Bharat Restaurant', email: 'jaibharat@krawing.com', phone: '9811122233', passwordHash, role: 'VENDOR' } });
    const vUser4 = await prisma.user.create({ data: { fullName: 'Ram Kumar (Lakkarpur Fresh Sabzi Mandi)', email: 'mandi@krawing.com', phone: '9444455555', passwordHash, role: 'VENDOR' } });

    console.log('2️⃣ Seeding Addresses...');
    const addr1 = await prisma.address.create({
      data: { userId: userRahul.id, label: 'Home', addressLine: 'Sector 15', city: 'Gurugram', state: 'Haryana', pincode: '122001', latitude: 28.4595, longitude: 77.0266, isDefault: true }
    });

    console.log('3️⃣ Seeding Categories...');
    const catPizza = await prisma.category.create({ data: { name: 'Pizza', slug: 'pizza', icon: 'Pizza', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=300' } });
    const catMomos = await prisma.category.create({ data: { name: 'Momos', slug: 'momos', icon: 'Utensils', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=300' } });
    const catNorth = await prisma.category.create({ data: { name: 'North Indian', slug: 'north-indian', icon: 'Utensils', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300' } });
    const catVeg = await prisma.category.create({ data: { name: 'Daily Vegetables', slug: 'daily-vegetables', icon: 'Leaf', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300' } });

    console.log('4️⃣ Seeding Vendors...');
    const vendorFoodHub = await prisma.vendor.create({
      data: {
        ownerUserId: vUser1.id,
        vendorType: 'CRAVINGS',
        name: 'Food Hub',
        phone: '9811111111',
        email: 'foodhub@gmail.com',
        address: 'Sector 14',
        city: 'Gurugram',
        latitude: 28.4590,
        longitude: 77.0390,
        rating: 4.5,
        numRatings: 120,
        deliveryFee: 30.00,
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
        bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200'
      }
    });

    const vendorMandi = await prisma.vendor.create({
      data: {
        ownerUserId: vUser4.id,
        vendorType: 'FRESH',
        name: 'Lakkarpur Wholesale Sabzi Mandi',
        phone: '9444455555',
        email: 'mandi@krawing.com',
        address: 'Wholesale Mandi Market, Lakkarpur',
        city: 'Faridabad',
        latitude: 28.4866,
        longitude: 77.2918,
        rating: 4.9,
        numRatings: 180,
        deliveryFee: 15.00,
        isVegOnly: true,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
        bannerImage: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&q=80&w=1200',
        freshTagline: 'Wholesale Price Guarantee • Handpicked Fresh Daily'
      }
    });

    console.log('5️⃣ Seeding Products...');
    const prodPizza = await prisma.product.create({
      data: {
        vendorId: vendorFoodHub.id,
        categoryId: catPizza.id,
        productType: 'FOOD',
        name: 'Farmhouse Pizza',
        description: 'Cheese pizza with fresh mushrooms, capsicum, tomatoes & mozzarella.',
        price: 399.00,
        discountPrice: 349.00,
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=400',
        isVeg: true
      }
    });

    const prodTomato = await prisma.product.create({
      data: {
        vendorId: vendorMandi.id,
        categoryId: catVeg.id,
        productType: 'VEGETABLE',
        name: 'Fresh Desi Tomatoes (Tamatar)',
        description: 'Firm, juicy red tomatoes freshly plucked from local farms this morning.',
        price: 38.00,
        unit: 'kg',
        freshnessBadge: 'Arrived 6 AM Today',
        weightOptions: [
          { weightLabel: '250g', price: 10 },
          { weightLabel: '500g', price: 19 },
          { weightLabel: '1kg', price: 38 }
        ],
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
        isVeg: true
      }
    });

    console.log('6️⃣ Seeding Coupons...');
    const couponWelcome = await prisma.coupon.create({
      data: {
        code: 'WELCOME50',
        title: 'FLAT ₹50 OFF',
        discountType: 'FLAT',
        discountValue: 50.00,
        minOrderValue: 199.00,
        maxDiscount: 50.00,
        isActive: true
      }
    });

    console.log('7️⃣ Seeding Sample Orders & Payments...');
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'KR-20260924-000101',
        orderType: 'CRAVINGS',
        customerId: userRahul.id,
        vendorId: vendorFoodHub.id,
        addressId: addr1.id,
        couponId: couponWelcome.id,
        subtotal: 349.00,
        deliveryFee: 30.00,
        tax: 17.45,
        discount: 50.00,
        totalAmount: 346.45,
        status: 'DELIVERED',
        deliveryNotes: 'Please ring bell',
        items: {
          create: [
            {
              productId: prodPizza.id,
              name: 'Farmhouse Pizza',
              unitPrice: 349.00,
              lineTotal: 349.00,
              quantity: 1,
              isVeg: true
            }
          ]
        }
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order1.id,
        transactionId: 'TXN-COD-10001',
        provider: 'COD',
        method: 'COD',
        amount: 346.45,
        status: 'PAID',
        collectedBy: driverArjun.id,
        paidAt: new Date()
      }
    });

    console.log('✅ DATABASE RE-SEEDED SUCCESSFULLY WITH FULL UNIFIED ARCHITECTURE!');
    return { success: true };
  } catch (err) {
    console.error('❌ Error during unified database seed:', err);
    throw err;
  }
};

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedData;
