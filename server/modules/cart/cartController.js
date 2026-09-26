const crypto = require('crypto');
const prisma = require('../../utils/prisma');

const normalizeMode = (modeStr) => {
  if (!modeStr) return null;
  const upper = modeStr.toString().toUpperCase();
  if (upper.includes('FRESH')) return 'FRESH';
  if (upper.includes('CRAVING')) return 'CRAVINGS';
  return 'CRAVINGS';
};

const getOrCreateCart = async (userId, cartType = 'CRAVINGS') => {
  let cart = await prisma.cart.findFirst({
    where: {
      userId,
      cartType
    },
    include: {
      Vendor: true,
      CartItem: {
        include: { Product: true }
      }
    }
  });

  if (cart) return cart;

  // Try creating a new cart record for this shopping mode
  try {
    cart = await prisma.cart.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        cartType
      },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });
  } catch (err) {
    // If duplicate race condition, fetch the exact (userId, cartType) cart safely
    cart = await prisma.cart.findFirst({
      where: { userId, cartType },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });
  }

  return cart;
};

const formatCart = (cart, cartType = 'CRAVINGS') => {
  const modeKey = cartType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS';
  if (!cart) {
    return {
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      discount: 0,
      grandTotal: 0,
      restaurantId: null,
      vendorId: null,
      restaurant: null,
      couponCode: '',
      shoppingMode: modeKey,
      cartType
    };
  }

  const rawItems = cart.CartItem || cart.items || [];
  const items = rawItems.map(item => {
    const productObj = item.Product || null;
    return {
      _id: item.id,
      id: item.id,
      foodId: item.productId,
      productId: item.productId,
      food: productObj ? {
        _id: productObj.id,
        id: productObj.id,
        name: productObj.name,
        price: Number(productObj.price || 0),
        image: productObj.image || '',
        isVeg: Boolean(productObj.isVeg),
        vendorId: productObj.vendorId
      } : null,
      name: item.name || productObj?.name || 'Item',
      price: Number(item.price || productObj?.price || 0),
      selectedWeight: item.selectedWeight || null,
      quantity: item.quantity || 1,
      isVeg: Boolean(item.isVeg ?? productObj?.isVeg ?? true),
      image: item.image || productObj?.image || ''
    };
  });

  // If there are NO items in the cart, ALL fees and vendor bindings MUST be ZERO / null
  if (items.length === 0) {
    return {
      _id: cart.id,
      id: cart.id,
      userId: cart.userId,
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      discount: 0,
      grandTotal: 0,
      restaurantId: null,
      vendorId: null,
      restaurant: null,
      couponCode: '',
      shoppingMode: cart.cartType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS',
      cartType: cart.cartType || cartType
    };
  }

  const vendorObj = cart.Vendor || cart.restaurant || null;
  const deliveryFee = vendorObj?.deliveryFee ? Number(vendorObj.deliveryFee) : 30;
  const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const discount = Number(cart.discount || 0);
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);

  const restaurant = vendorObj ? {
    _id: vendorObj.id,
    id: vendorObj.id,
    name: vendorObj.name,
    image: vendorObj.image,
    address: vendorObj.address,
    city: vendorObj.city,
    deliveryFee,
    deliveryTime: vendorObj.deliveryTime || '25-35 min',
    vendorType: vendorObj.vendorType
  } : null;

  return {
    _id: cart.id,
    id: cart.id,
    userId: cart.userId,
    items,
    subtotal,
    deliveryFee,
    tax,
    discount,
    grandTotal,
    restaurantId: cart.vendorId || null,
    vendorId: cart.vendorId || null,
    restaurant,
    shoppingMode: cart.cartType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS',
    cartType: cart.cartType || cartType,
    couponCode: cart.couponCode || ''
  };
};

// @desc Get user cart (mode-aware)
// @route GET /api/cart
const getCart = async (req, res, next) => {
  try {
    const modeQuery = req.query.mode || req.query.shoppingMode || req.query.cartType;
    const requestedMode = normalizeMode(modeQuery) || 'CRAVINGS';

    const cravingsCart = await getOrCreateCart(req.user.id, 'CRAVINGS');
    const freshCart = await getOrCreateCart(req.user.id, 'FRESH');

    // If a cart has 0 CartItems, reset vendorId in DB if needed
    for (const c of [cravingsCart, freshCart]) {
      if (c && c.CartItem && c.CartItem.length === 0 && c.vendorId) {
        await prisma.cart.update({
          where: { id: c.id },
          data: { vendorId: null, couponCode: '', discount: 0 }
        });
        c.vendorId = null;
      }
    }

    const formattedCravings = formatCart(cravingsCart, 'CRAVINGS');
    const formattedFresh = formatCart(freshCart, 'FRESH');
    const activeCart = requestedMode === 'FRESH' ? formattedFresh : formattedCravings;

    res.json({
      success: true,
      cart: activeCart,
      carts: {
        CRAVINGS: formattedCravings,
        FRESH_MANDI: formattedFresh
      },
      CRAVINGS: formattedCravings,
      FRESH_MANDI: formattedFresh
    });
  } catch (err) {
    console.error('getCart error:', err);
    next(err);
  }
};

// @desc Add item to cart (mode-aware)
// @route POST /api/cart/add
const addToCart = async (req, res, next) => {
  try {
    const { foodId, productId, quantity = 1, selectedWeight, mode, shoppingMode, cartType: inputCartType } = req.body;
    const targetId = foodId || productId;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const food = await prisma.product.findUnique({
      where: { id: targetId },
      include: { Vendor: true }
    });
    if (!food) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let targetCartType = normalizeMode(mode || shoppingMode || inputCartType);
    if (!targetCartType) {
      if (food.Vendor && food.Vendor.vendorType === 'FRESH') {
        targetCartType = 'FRESH';
      } else if (food.productType !== 'FOOD') {
        targetCartType = 'FRESH';
      } else {
        targetCartType = 'CRAVINGS';
      }
    }

    let cart = await getOrCreateCart(req.user.id, targetCartType);

    // If cart has 0 items, ensure vendorId is cleared completely
    if (cart.CartItem.length === 0) {
      if (cart.vendorId || cart.couponCode || Number(cart.discount) > 0) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { vendorId: null, couponCode: '', discount: 0 }
        });
      }
      cart.vendorId = null;
    }

    // Single-restaurant restriction ONLY triggers if cart ALREADY HAS active items from a DIFFERENT vendor
    if (cart.vendorId && cart.vendorId !== food.vendorId && cart.CartItem.length > 0) {
      const modeLabel = targetCartType === 'FRESH' ? 'Fresh Mandi' : 'Cravings';
      return res.status(400).json({
        success: false,
        message: `Your ${modeLabel} cart contains items from another store. Clear your ${modeLabel} cart to add items from this store.`,
        requiresClear: true,
        shoppingMode: targetCartType === 'FRESH' ? 'FRESH_MANDI' : 'CRAVINGS'
      });
    }

    let price = Number(food.price);
    if (selectedWeight && food.weightOptions && Array.isArray(food.weightOptions)) {
      const option = food.weightOptions.find(o => o.weightLabel === selectedWeight);
      if (option && option.price) {
        price = Number(option.price);
      }
    }

    const existingItem = cart.CartItem.find(item => item.productId === targetId && item.selectedWeight === (selectedWeight || null));

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          id: crypto.randomUUID(),
          cartId: cart.id,
          productId: food.id,
          name: food.name,
          price,
          selectedWeight: selectedWeight || null,
          quantity,
          isVeg: food.isVeg,
          image: food.image
        }
      });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { vendorId: food.vendorId }
    });

    const cravingsCart = await getOrCreateCart(req.user.id, 'CRAVINGS');
    const freshCart = await getOrCreateCart(req.user.id, 'FRESH');

    const formattedCravings = formatCart(cravingsCart, 'CRAVINGS');
    const formattedFresh = formatCart(freshCart, 'FRESH');
    const activeCart = targetCartType === 'FRESH' ? formattedFresh : formattedCravings;

    res.json({
      success: true,
      cart: activeCart,
      carts: {
        CRAVINGS: formattedCravings,
        FRESH_MANDI: formattedFresh
      },
      CRAVINGS: formattedCravings,
      FRESH_MANDI: formattedFresh
    });
  } catch (err) {
    console.error('addToCart error:', err);
    next(err);
  }
};

// @desc Update cart item quantity (mode-aware)
// @route PUT /api/cart/update
const updateCartItem = async (req, res, next) => {
  try {
    const { foodId, productId, quantity, mode, shoppingMode, cartType: inputCartType } = req.body;
    const targetId = foodId || productId;
    const targetCartType = normalizeMode(mode || shoppingMode || inputCartType) || 'CRAVINGS';

    let cart = await getOrCreateCart(req.user.id, targetCartType);

    const item = cart.CartItem.find(i => i.productId === targetId || i.id === targetId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity }
      });
    }

    const remainingItems = await prisma.cartItem.count({ where: { cartId: cart.id } });
    if (remainingItems === 0) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          vendorId: null,
          couponCode: '',
          discount: 0
        }
      });
    }

    const cravingsCart = await getOrCreateCart(req.user.id, 'CRAVINGS');
    const freshCart = await getOrCreateCart(req.user.id, 'FRESH');

    const formattedCravings = formatCart(cravingsCart, 'CRAVINGS');
    const formattedFresh = formatCart(freshCart, 'FRESH');
    const activeCart = cart.cartType === 'FRESH' ? formattedFresh : formattedCravings;

    res.json({
      success: true,
      cart: activeCart,
      carts: {
        CRAVINGS: formattedCravings,
        FRESH_MANDI: formattedFresh
      },
      CRAVINGS: formattedCravings,
      FRESH_MANDI: formattedFresh
    });
  } catch (err) {
    console.error('updateCartItem error:', err);
    next(err);
  }
};

// @desc Apply coupon to cart (mode-aware)
// @route POST /api/cart/coupon
const applyCoupon = async (req, res, next) => {
  try {
    const { code, mode, shoppingMode, cartType: inputCartType } = req.body;
    const targetCartType = normalizeMode(mode || shoppingMode || inputCartType) || 'CRAVINGS';

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    let cart = await getOrCreateCart(req.user.id, targetCartType);

    if (!cart || cart.CartItem.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const subtotal = cart.CartItem.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);

    if (subtotal < Number(coupon.minOrderValue)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for coupon ${coupon.code} is ₹${coupon.minOrderValue}`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.min((subtotal * Number(coupon.discountValue)) / 100, Number(coupon.maxDiscount || 9999));
    } else {
      discount = Number(coupon.discountValue);
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: coupon.code,
        discount: Math.round(discount)
      }
    });

    const cravingsCart = await getOrCreateCart(req.user.id, 'CRAVINGS');
    const freshCart = await getOrCreateCart(req.user.id, 'FRESH');

    const formattedCravings = formatCart(cravingsCart, 'CRAVINGS');
    const formattedFresh = formatCart(freshCart, 'FRESH');
    const activeCart = targetCartType === 'FRESH' ? formattedFresh : formattedCravings;

    res.json({
      success: true,
      message: 'Coupon applied successfully!',
      cart: activeCart,
      carts: {
        CRAVINGS: formattedCravings,
        FRESH_MANDI: formattedFresh
      },
      CRAVINGS: formattedCravings,
      FRESH_MANDI: formattedFresh
    });
  } catch (err) {
    console.error('applyCoupon error:', err);
    next(err);
  }
};

// @desc Clear cart (mode-aware)
// @route DELETE /api/cart
const clearCart = async (req, res, next) => {
  try {
    const modeQuery = req.query.mode || req.query.shoppingMode || req.query.cartType || req.body?.mode || req.body?.shoppingMode;
    const targetCartType = normalizeMode(modeQuery) || 'CRAVINGS';

    let cart = await getOrCreateCart(req.user.id, targetCartType);

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          vendorId: null,
          couponCode: '',
          discount: 0
        }
      });
    }

    const cravingsCart = await getOrCreateCart(req.user.id, 'CRAVINGS');
    const freshCart = await getOrCreateCart(req.user.id, 'FRESH');

    const formattedCravings = formatCart(cravingsCart, 'CRAVINGS');
    const formattedFresh = formatCart(freshCart, 'FRESH');
    const activeCart = targetCartType === 'FRESH' ? formattedFresh : formattedCravings;

    res.json({
      success: true,
      message: `${targetCartType === 'FRESH' ? 'Fresh Mandi' : 'Cravings'} cart cleared`,
      cart: activeCart,
      carts: {
        CRAVINGS: formattedCravings,
        FRESH_MANDI: formattedFresh
      },
      CRAVINGS: formattedCravings,
      FRESH_MANDI: formattedFresh
    });
  } catch (err) {
    console.error('clearCart error:', err);
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  applyCoupon,
  clearCart
};
