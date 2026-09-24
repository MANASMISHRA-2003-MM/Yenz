const crypto = require('crypto');
const prisma = require('../../utils/prisma');

const formatCart = (cart) => {
  if (!cart) return { items: [], restaurantId: null, vendorId: null, restaurant: null, discount: 0, couponCode: '' };

  const rawItems = cart.CartItem || cart.items || [];
  const items = rawItems.map(item => ({
    _id: item.id,
    id: item.id,
    foodId: item.productId,
    productId: item.productId,
    food: item.Product ? {
      _id: item.Product.id,
      id: item.Product.id,
      name: item.Product.name,
      price: Number(item.Product.price),
      image: item.Product.image,
      isVeg: item.Product.isVeg,
      vendorId: item.Product.vendorId
    } : null,
    name: item.name,
    price: Number(item.price),
    selectedWeight: item.selectedWeight || null,
    quantity: item.quantity,
    isVeg: item.isVeg,
    image: item.image
  }));

  const vendorObj = cart.Vendor || cart.restaurant || null;
  const restaurant = vendorObj ? {
    _id: vendorObj.id,
    id: vendorObj.id,
    name: vendorObj.name,
    image: vendorObj.image,
    address: vendorObj.address,
    city: vendorObj.city,
    deliveryFee: Number(vendorObj.deliveryFee || 0),
    deliveryTime: vendorObj.deliveryTime || '25-35 min'
  } : null;

  return {
    _id: cart.id,
    id: cart.id,
    userId: cart.userId,
    restaurantId: cart.vendorId,
    vendorId: cart.vendorId,
    restaurant,
    couponCode: cart.couponCode || '',
    discount: Number(cart.discount || 0),
    items
  };
};

// @desc Get user cart
// @route GET /api/cart
const getCart = async (req, res, next) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user.id
        },
        include: {
          Vendor: true,
          CartItem: {
            include: { Product: true }
          }
        }
      });
    }

    res.json({ success: true, cart: formatCart(cart) });
  } catch (err) {
    console.error('getCart error:', err);
    next(err);
  }
};

// @desc Add item to cart
// @route POST /api/cart/add
const addToCart = async (req, res, next) => {
  try {
    const { foodId, productId, quantity = 1, selectedWeight } = req.body;
    const targetId = foodId || productId;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const food = await prisma.product.findUnique({ where: { id: targetId } });
    if (!food) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { CartItem: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          id: crypto.randomUUID(),
          userId: req.user.id
        },
        include: { CartItem: true }
      });
    }

    // Check if adding item from a different vendor
    if (cart.vendorId && cart.vendorId !== food.vendorId && cart.CartItem.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart contains items from another store. Clear cart to add items from this store.',
        requiresClear: true
      });
    }

    // Determine price based on selected weight option if present
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

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });

    res.json({ success: true, cart: formatCart(updatedCart) });
  } catch (err) {
    console.error('addToCart error:', err);
    next(err);
  }
};

// @desc Update cart item quantity
// @route PUT /api/cart/update
const updateCartItem = async (req, res, next) => {
  try {
    const { foodId, productId, quantity } = req.body;
    const targetId = foodId || productId;

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { CartItem: true }
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

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

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });

    res.json({ success: true, cart: formatCart(updatedCart) });
  } catch (err) {
    console.error('updateCartItem error:', err);
    next(err);
  }
};

// @desc Apply coupon to cart
// @route POST /api/cart/coupon
const applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { CartItem: true }
    });

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

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        Vendor: true,
        CartItem: {
          include: { Product: true }
        }
      }
    });

    res.json({ success: true, message: 'Coupon applied successfully!', cart: formatCart(updatedCart) });
  } catch (err) {
    console.error('applyCoupon error:', err);
    next(err);
  }
};

// @desc Clear cart
// @route DELETE /api/cart
const clearCart = async (req, res, next) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id }
    });

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

    res.json({ success: true, message: 'Cart cleared', cart: { items: [], restaurantId: null, vendorId: null } });
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
