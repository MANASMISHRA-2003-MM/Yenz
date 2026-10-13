const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAll() {
  console.log('--- 1. Testing Universal Profile Icon across all roles ---');
  const accounts = [
    { email: 'admin@krawing.com', pass: 'password123', role: 'admin' },
    { email: 'foodhub@gmail.com', pass: 'password123', role: 'vendor' },
    { email: 'driver.arjun@krawing.com', pass: 'password123', role: 'delivery_partner' },
    { email: 'rahul@gmail.com', pass: 'password123', role: 'consumer' }
  ];

  const tokens = {};
  for (const acc of accounts) {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email: acc.email, password: acc.pass });
    const user = res.data.user;
    tokens[acc.role] = res.data.token;
    console.log(`[${acc.role}] avatar: ${user.avatar}`);
    if (user.avatar !== 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000') {
      throw new Error(`Avatar mismatch for ${acc.role}: ${user.avatar}`);
    }
  }
  console.log('✅ Universal icons8 profile icon verified for all user roles!');

  console.log('\n--- 2. Testing Vendor Restriction: Dish creation and uploads ---');
  // Vendor tries to create a dish
  try {
    await axios.post(`${BASE_URL}/foods`, {
      name: 'Unauthorized Vendor Dish',
      price: 150,
      image: 'https://example.com/unauthorized.jpg'
    }, {
      headers: { Authorization: `Bearer ${tokens.vendor}` }
    });
    throw new Error('Vendor was able to create dish! Should have failed.');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Vendor blocked from creating dishes (403 Forbidden):', err.response.data.message);
    } else {
      throw err;
    }
  }

  // Get a product belonging to the vendor
  const vendorMeRes = await axios.get(`${BASE_URL}/restaurants/vendor/me`, {
    headers: { Authorization: `Bearer ${tokens.vendor}` }
  });
  const vendorId = vendorMeRes.data.restaurant.id;
  const foodsRes = await axios.get(`${BASE_URL}/foods?vendorId=${vendorId}&availableOnly=false`);
  const products = foodsRes.data.foods;
  if (!products.length) {
    throw new Error('No products found for vendor');
  }
  const targetProduct = products[0];
  console.log(`Testing with product: "${targetProduct.name}" (ID: ${targetProduct.id})`);

  // Vendor tries to change name/price/image of dish
  try {
    await axios.put(`${BASE_URL}/foods/${targetProduct.id}`, {
      name: 'Hacked Dish Name',
      price: 9999
    }, {
      headers: { Authorization: `Bearer ${tokens.vendor}` }
    });
    throw new Error('Vendor was able to edit dish details! Should have failed.');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Vendor blocked from modifying dish info (403 Forbidden):', err.response.data.message);
    } else {
      throw err;
    }
  }

  // Vendor tries to delete product
  try {
    await axios.delete(`${BASE_URL}/foods/${targetProduct.id}`, {
      headers: { Authorization: `Bearer ${tokens.vendor}` }
    });
    throw new Error('Vendor was able to delete dish! Should have failed.');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Vendor blocked from deleting dishes (403 Forbidden):', err.response.data.message);
    } else {
      throw err;
    }
  }

  console.log('\n--- 3. Testing Product Availability Toggle ---');
  // Mark product OUT OF STOCK
  const markOutRes = await axios.put(`${BASE_URL}/foods/${targetProduct.id}`, {
    isAvailable: false
  }, {
    headers: { Authorization: `Bearer ${tokens.vendor}` }
  });
  console.log(`Vendor marked product out of stock: isAvailable=${markOutRes.data.food.isAvailable}`);

  // Customer checks restaurant menu
  const restDetail = await axios.get(`${BASE_URL}/restaurants/${vendorId}`);
  const itemInMenu = restDetail.data.menu.find(m => m.id === targetProduct.id);
  console.log(`Customer sees product in menu with isAvailable=${itemInMenu?.isAvailable}`);
  if (itemInMenu?.isAvailable !== false) {
    throw new Error('Menu item did not reflect isAvailable: false');
  }

  // Customer attempts to add out of stock product to cart
  try {
    await axios.post(`${BASE_URL}/cart/add`, {
      foodId: targetProduct.id,
      quantity: 1
    }, {
      headers: { Authorization: `Bearer ${tokens.consumer}` }
    });
    throw new Error('Customer was able to add out-of-stock item to cart! Should have failed.');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('✅ Customer blocked from adding out-of-stock item (400 Bad Request):', err.response.data.message);
    } else {
      throw err;
    }
  }

  // Mark product AVAILABLE again
  const markAvailRes = await axios.put(`${BASE_URL}/foods/${targetProduct.id}`, {
    isAvailable: true
  }, {
    headers: { Authorization: `Bearer ${tokens.vendor}` }
  });
  console.log(`Vendor marked product available: isAvailable=${markAvailRes.data.food.isAvailable}`);

  // Customer adds available product to cart
  const addSuccess = await axios.post(`${BASE_URL}/cart/add`, {
    foodId: targetProduct.id,
    quantity: 1
  }, {
    headers: { Authorization: `Bearer ${tokens.consumer}` }
  });
  console.log('✅ Customer successfully added available product to cart! Result:', addSuccess.data.success);

  console.log('\n🎉 ALL VALIDATION CHECKS PASSED PERFECTLY!');
}

testAll().catch(err => {
  console.error('❌ Test failed:', err.message, err.response?.data || '');
  process.exit(1);
});
