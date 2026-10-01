const prisma = require('../../utils/prisma');

// Haversine distance in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    distanceKm: vendor.distanceKm !== undefined ? vendor.distanceKm : 2.5,
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

// @desc Get all vendors/restaurants with 5 km radius filtering & search
// @route GET /api/restaurants
const getRestaurants = async (req, res, next) => {
  try {
    const { search, isVegOnly, minRating, sortBy, vendorType, lat, lng, radius, status } = req.query;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    // Filter by vendorType (CRAVINGS or FRESH)
    if (vendorType) {
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

    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;
    const maxRadius = radius ? Number(radius) : 5.0; // Default 5 km radius

    let restaurants = rawVendors.map(v => {
      let dist = 2.5;
      if (userLat && userLng && v.latitude && v.longitude) {
        dist = Number(calculateDistanceKm(userLat, userLng, Number(v.latitude), Number(v.longitude)).toFixed(1));
      }
      return formatVendorObj({ ...v, distanceKm: dist });
    });

    // Sort restaurants by distance if user coordinates provided, preserving all database vendors
    if (userLat && userLng) {
      restaurants.sort((a, b) => {
        const dA = (a.distanceKm !== null && a.distanceKm !== undefined) ? Number(a.distanceKm) : 999;
        const dB = (b.distanceKm !== null && b.distanceKm !== undefined) ? Number(b.distanceKm) : 999;
        return dA - dB;
      });
    }

    res.json({
      success: true,
      count: restaurants.length,
      maxRadiusKm: maxRadius,
      restaurants
    });
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
    const roleUpper = (req.user.role || '').toUpperCase();
    if (existing.ownerUserId !== req.user.id && roleUpper !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this store' });
    }

    const {
      name,
      vendorType,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      rating,
      deliveryTime,
      deliveryFee,
      priceRange,
      isVegOnly,
      status,
      image,
      imagePublicId,
      bannerImage,
      bannerImagePublicId,
      offers,
      freshTagline
    } = req.body;

    const updateData = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (vendorType !== undefined) {
      updateData.vendorType = String(vendorType).toUpperCase().includes('FRESH') ? 'FRESH' : 'CRAVINGS';
    }
    if (phone !== undefined && phone.trim()) updateData.phone = phone.trim();
    if (email !== undefined) {
      updateData.email = email && email.trim() ? email.trim() : null;
    }
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (latitude !== undefined && latitude !== null && latitude !== '') updateData.latitude = Number(latitude);
    if (longitude !== undefined && longitude !== null && longitude !== '') updateData.longitude = Number(longitude);
    if (rating !== undefined && rating !== null && rating !== '') updateData.rating = Number(rating);
    if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
    if (deliveryFee !== undefined && deliveryFee !== null && deliveryFee !== '') {
      updateData.deliveryFee = Number(deliveryFee);
    }
    if (priceRange !== undefined) updateData.priceRange = priceRange;
    if (isVegOnly !== undefined) updateData.isVegOnly = Boolean(isVegOnly);
    if (status !== undefined) updateData.status = status;
    if (image !== undefined && image.trim()) updateData.image = image.trim();
    if (imagePublicId !== undefined) updateData.imagePublicId = imagePublicId || null;
    if (bannerImage !== undefined) {
      updateData.bannerImage = bannerImage && bannerImage.trim() ? bannerImage.trim() : null;
    }
    if (bannerImagePublicId !== undefined) updateData.bannerImagePublicId = bannerImagePublicId || null;
    if (offers !== undefined) updateData.offers = Array.isArray(offers) ? offers : [];
    if (freshTagline !== undefined) updateData.freshTagline = freshTagline;

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, restaurant: formatVendorObj(updated) });
  } catch (err) {
    console.error('updateRestaurant error:', err);
    next(err);
  }
};

// @desc Create new Vendor Store (Admin)
// @route POST /api/restaurants
const createVendor = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const {
      name,
      vendorType,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      deliveryFee,
      deliveryTime,
      image,
      imagePublicId,
      bannerImage,
      bannerImagePublicId,
      ownerUserId
    } = req.body;

    let finalImageUrl = image && image.trim() ? image.trim() : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600';
    let finalBannerUrl = bannerImage && bannerImage.trim() ? bannerImage.trim() : null;

    const created = await prisma.vendor.create({
      data: {
        id: crypto.randomUUID(),
        ownerUserId: ownerUserId || req.user.id,
        name: name && name.trim() ? name.trim() : 'New Store',
        vendorType: (vendorType && vendorType.toUpperCase().includes('FRESH')) ? 'FRESH' : 'CRAVINGS',
        phone: phone && phone.trim() ? phone.trim() : `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        email: email && email.trim() ? email.trim() : null,
        address: address || 'Main Market',
        city: city || 'Faridabad',
        state: state || 'Haryana',
        pincode: pincode || '121009',
        deliveryFee: deliveryFee !== undefined && deliveryFee !== null && deliveryFee !== '' ? Number(deliveryFee) : 30.00,
        deliveryTime: deliveryTime || '25-35 min',
        image: finalImageUrl,
        imagePublicId: imagePublicId || null,
        bannerImage: finalBannerUrl,
        bannerImagePublicId: bannerImagePublicId || null,
        status: 'open'
      }
    });

    res.status(201).json({ success: true, restaurant: formatVendorObj(created) });
  } catch (err) {
    console.error('createVendor error:', err);
    next(err);
  }
};

// @desc Submit Vendor Application
// @route POST /api/restaurants/application
const submitVendorApplication = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const { fullName, phone, email, businessName, vendorType, address, city, state, pincode, fssaiNumber, gstNumber, documents } = req.body;

    const existingApp = await prisma.vendorApplication.findFirst({
      where: { userId: req.user.id, status: 'PENDING' }
    });

    if (existingApp) {
      return res.status(400).json({ success: false, message: 'You already have a pending vendor application under review' });
    }

    const app = await prisma.vendorApplication.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user.id,
        fullName: fullName || req.user.fullName,
        phone: phone || req.user.phone,
        email: email || req.user.email,
        businessName: businessName || 'My Store',
        vendorType: (vendorType && vendorType.toUpperCase().includes('FRESH')) ? 'FRESH' : 'CRAVINGS',
        address: address || 'Sector 62',
        city: city || 'Noida',
        state: state || 'Uttar Pradesh',
        pincode: pincode || '201301',
        fssaiNumber: fssaiNumber || null,
        gstNumber: gstNumber || null,
        documents: documents || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Vendor application submitted for admin review', application: app });
  } catch (err) {
    next(err);
  }
};

// @desc Get current user's Vendor Application
// @route GET /api/restaurants/application/me
const getMyVendorApplication = async (req, res, next) => {
  try {
    const app = await prisma.vendorApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, application: app });
  } catch (err) {
    next(err);
  }
};

// @desc Toggle vendor store status between 'open' and 'closed' (Vendor & Admin Access)
// @route PUT /api/restaurants/vendor/toggle-status
// @route PUT /api/restaurants/:id/toggle-status
const toggleVendorStatus = async (req, res, next) => {
  try {
    const { normalizeRole } = require('../../middlewares/authMiddleware');
    const roleUpper = normalizeRole(req.user?.role);
    const targetId = req.params.id || req.body?.restaurantId || req.body?.vendorId;

    let whereClause = {};
    if (targetId && (roleUpper === 'ADMIN' || roleUpper === 'VENDOR')) {
      whereClause = { id: targetId };
    } else {
      whereClause = { ownerUserId: req.user.id };
    }

    const rawVendor = await prisma.vendor.findFirst({
      where: whereClause
    });

    if (!rawVendor) {
      return res.status(404).json({ success: false, message: 'Vendor store not found' });
    }

    // Check authorization: must be store owner or ADMIN
    if (rawVendor.ownerUserId !== req.user.id && roleUpper !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to change this store open/closed status' });
    }

    const requestedStatus = req.body?.status;
    const nextStatus = requestedStatus
      ? (requestedStatus === 'open' || requestedStatus === 'OPEN' ? 'open' : 'closed')
      : (rawVendor.status === 'open' ? 'closed' : 'open');

    const updated = await prisma.vendor.update({
      where: { id: rawVendor.id },
      data: { status: nextStatus }
    });

    // Sync owner user's isOnline status
    if (rawVendor.ownerUserId) {
      await prisma.user.update({
        where: { id: rawVendor.ownerUserId },
        data: { isOnline: nextStatus === 'open' }
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Store "${updated.name}" is now ${nextStatus === 'open' ? 'ONLINE (Open)' : 'OFFLINE (Closed)'}`,
      restaurant: formatVendorObj(updated)
    });
  } catch (err) {
    console.error('toggleVendorStatus error:', err);
    next(err);
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
  getMyVendorRestaurant,
  toggleVendorStatus,
  updateRestaurant,
  createVendor,
  submitVendorApplication,
  getMyVendorApplication
};


