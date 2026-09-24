const prisma = require('../../utils/prisma');

// Helper to format a Vendor object to a consistent restaurant-like response
const formatVendorObj = (vendor) => {
  if (!vendor) return null;
  return {
    _id: vendor.id,
    id: vendor.id,
    name: vendor.name,
    vendor_name: vendor.name,
    vendorType: vendor.vendorType,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    pincode: vendor.pincode,
    latitude: vendor.latitude ? Number(vendor.latitude) : null,
    longitude: vendor.longitude ? Number(vendor.longitude) : null,
    rating: Number(vendor.rating),
    numRatings: vendor.numRatings,
    deliveryTime: vendor.deliveryTime,
    deliveryFee: Number(vendor.deliveryFee),
    priceRange: vendor.priceRange,
    isVegOnly: vendor.isVegOnly,
    status: vendor.status,
    image: vendor.image,
    bannerImage: vendor.bannerImage,
    offers: vendor.offers,
    freshTagline: vendor.freshTagline,
    ownerUserId: vendor.ownerUserId,
    createdAt: vendor.createdAt
  };
};

// @desc Get all vendors/restaurants with search & filter
// @route GET /api/restaurants
const getRestaurants = async (req, res, next) => {
  try {
    const { search, isVegOnly, minRating, sortBy, vendorType } = req.query;

    let whereClause = { status: 'open' };

    // Filter by vendorType (CRAVINGS or FRESH)
    if (vendorType) {
      // Handle frontend sending 'FRESH_MARKET' or 'FOOD_RESTAURANT'
      if (vendorType === 'FRESH_MARKET' || vendorType === 'FRESH') {
        whereClause.vendorType = 'FRESH';
      } else if (vendorType === 'FOOD_RESTAURANT' || vendorType === 'CRAVINGS') {
        whereClause.vendorType = 'CRAVINGS';
      }
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isVegOnly === 'true') {
      whereClause.isVegOnly = true;
    }

    if (minRating) {
      whereClause.rating = { gte: Number(minRating) };
    }

    let orderByClause = { rating: 'desc' };
    if (sortBy === 'deliveryTime') {
      orderByClause = { numRatings: 'desc' };
    } else if (sortBy === 'deliveryFee') {
      orderByClause = { deliveryFee: 'asc' };
    }

    const rawVendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: orderByClause
    });

    const restaurants = rawVendors.map(formatVendorObj);

    res.json({ success: true, count: restaurants.length, restaurants });
  } catch (err) {
    console.error('getRestaurants error:', err);
    next(err);
  }
};

// @desc Get single vendor/restaurant details + menu
// @route GET /api/restaurants/:id
const getRestaurantById = async (req, res, next) => {
  try {
    const rawVendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        Product: {
          where: { isAvailable: true },
          include: { Category: true }
        },
        VendorHours: true
      }
    });

    if (!rawVendor) {
      return res.status(404).json({ success: false, message: 'Vendor / Restaurant not found' });
    }

    const restaurant = formatVendorObj(rawVendor);

    const menu = (rawVendor.Product || []).map(p => ({
      _id: p.id,
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      image: p.image,
      isVeg: p.isVeg,
      isAvailable: p.isAvailable,
      productType: p.productType,
      unit: p.unit,
      weightOptions: p.weightOptions,
      freshnessBadge: p.freshnessBadge,
      prepTime: p.prepTime,
      rating: p.rating ? Number(p.rating) : 4.5,
      category: p.Category?.name || '',
      categoryId: p.categoryId,
      vendorId: p.vendorId
    }));

    res.json({
      success: true,
      restaurant,
      menu
    });
  } catch (err) {
    console.error('getRestaurantById error:', err);
    next(err);
  }
};

// @desc Get current vendor's restaurant profile
// @route GET /api/restaurants/vendor/me
const getMyVendorRestaurant = async (req, res, next) => {
  try {
    const rawVendor = await prisma.vendor.findFirst({
      where: { ownerUserId: req.user.id },
      include: {
        Product: {
          include: { Category: true }
        },
        VendorHours: true
      }
    });

    if (!rawVendor) {
      return res.status(404).json({ success: false, message: 'No store associated with this vendor' });
    }

    const restaurant = formatVendorObj(rawVendor);

    const menu = (rawVendor.Product || []).map(p => ({
      _id: p.id,
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      image: p.image,
      isVeg: p.isVeg,
      isAvailable: p.isAvailable,
      productType: p.productType,
      unit: p.unit,
      weightOptions: p.weightOptions,
      freshnessBadge: p.freshnessBadge,
      prepTime: p.prepTime,
      rating: p.rating ? Number(p.rating) : 4.5,
      category: p.Category?.name || '',
      categoryId: p.categoryId,
      vendorId: p.vendorId
    }));

    res.json({ success: true, restaurant, menu });
  } catch (err) {
    console.error('getMyVendorRestaurant error:', err);
    next(err);
  }
};

// @desc Update vendor/restaurant details
// @route PUT /api/restaurants/:id
const updateRestaurant = async (req, res, next) => {
  try {
    const existing = await prisma.vendor.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Check ownership or admin
    if (existing.ownerUserId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this store' });
    }

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json({ success: true, restaurant: formatVendorObj(updated) });
  } catch (err) {
    console.error('updateRestaurant error:', err);
    next(err);
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
  getMyVendorRestaurant,
  updateRestaurant
};
