const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const formatCart = (cart) => {
  if (!cart) return cart;
  const formatted = formatWithId(cart);
  if (formatted.restaurant) {
    formatted.restaurantId = formatted.restaurant;
  }
  return formatted;
};

// @desc Get user cart
// @route GET /api/cart
const getCart = async (req, res, next) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        restaurant: {
          select: { id: true, name: true, image: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, deliveryFee: true, deliveryTime: true }
        },
        items: {
          include: { food: true }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: {
          restaurant: {
            select: { id: true, name: true, image: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, deliveryFee: true, deliveryTime: true }
          },
          items: {
            include: { food: true }
          }
        }
      });
    }

    res.json({ success: true, cart: formatCart(cart) });
  } catch (err) {
    next(err);
  }
};

// @desc Add item to cart
// @route POST /api/cart/add
const addToCart = async (req, res, next) => {
  try {
    const { foodId, quantity = 1, selectedWeight } = req.body;

    const food = await prisma.foodItem.findUnique({ where: { id: foodId } });
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: { items: true }
      });
    }

    // Check if adding item from a different restaurant
    if (cart.restaurantId && cart.restaurantId !== food.restaurantId && cart.items.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart contains items from another restaurant. Clear cart to add items from this restaurant.',
        requiresClear: true
      });
    }

    // Determine price based on selected weight option if present
    let price = food.price;
    if (selectedWeight && food.weightOptions && Array.isArray(food.weightOptions)) {
      const option = food.weightOptions.find(o => o.weightLabel === selectedWeight);
      if (option && option.price) {
        price = option.price;
      }
    }

    const existingItem = cart.items.find(item => item.foodId === foodId && item.selectedWeight === (selectedWeight || null));

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          foodId: food.id,
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
      data: { restaurantId: food.restaurantId }
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        restaurant: {
          select: { id: true, name: true, image: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, deliveryFee: true, deliveryTime: true }
        },
        items: {
          include: { food: true }
        }
      }
    });

    res.json({ success: true, cart: formatCart(updatedCart) });
  } catch (err) {
    next(err);
  }
};

// @desc Update cart item quantity
// @route PUT /api/cart/update
const updateCartItem = async (req, res, next) => {
  try {
    const { foodId, quantity } = req.body;

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: true }
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find(i => i.foodId === foodId);
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
          restaurantId: null,
          couponCode: '',
          discount: 0
        }
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        restaurant: {
          select: { id: true, name: true, image: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, deliveryFee: true, deliveryTime: true }
        },
        items: {
          include: { food: true }
        }
      }
    });

    res.json({ success: true, cart: formatCart(updatedCart) });
  } catch (err) {
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
      include: { items: true }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const subtotal = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for coupon ${coupon.code} is ₹${coupon.minOrderValue}`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
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
        restaurant: {
          select: { id: true, name: true, image: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, deliveryFee: true, deliveryTime: true }
        },
        items: {
          include: { food: true }
        }
      }
    });

    res.json({ success: true, message: 'Coupon applied successfully!', cart: formatCart(updatedCart) });
  } catch (err) {
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
          restaurantId: null,
          couponCode: '',
          discount: 0
        }
      });
    }

    res.json({ success: true, message: 'Cart cleared', cart: { items: [], restaurantId: null } });
  } catch (err) {
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
