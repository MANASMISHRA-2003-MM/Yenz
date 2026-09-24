const prisma = require('../../utils/prisma');

// @desc Get all food items / products with search & category filters
// @route GET /api/foods
const getFoods = async (req, res, next) => {
  try {
    const { search, category, isVeg, productType, vendorId } = req.query;

    const whereClause = {
      isAvailable: true
    };

    // Filter by productType (e.g. FOOD, VEGETABLE, FRUIT, GROCERY)
    if (productType) {
      const types = productType.split(',').map(t => t.trim());
      if (types.length === 1) {
        whereClause.productType = types[0];
      } else {
        whereClause.productType = { in: types };
      }
    }

    // Vegetarian filter
    if (isVeg === 'true') {
      whereClause.isVeg = true;
    }

    // Vendor filter
    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    // Category filter
    if (category && category !== 'ALL') {
      whereClause.Category = {
        name: {
          contains: category,
          mode: 'insensitive'
        }
      };
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          Category: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          Vendor: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    const rawFoods = await prisma.product.findMany({
      where: whereClause,
      include: {
        Category: true,
        Vendor: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const foods = rawFoods.map(food => ({
      _id: food.id,
      id: food.id,

      name: food.name,
      description: food.description,

      price: Number(food.price),
      discountPrice: food.discountPrice ? Number(food.discountPrice) : null,

      image: food.image,

      isVeg: food.isVeg,
      isAvailable: food.isAvailable,

      productType: food.productType,
      unit: food.unit,
      weightOptions: food.weightOptions,
      freshnessBadge: food.freshnessBadge,
      prepTime: food.prepTime,
      rating: food.rating ? Number(food.rating) : 4.5,
      stockKg: food.stockKg ? Number(food.stockKg) : null,

      category: food.Category?.name || '',
      categoryId: food.categoryId,

      vendorId: food.vendorId,

      restaurant: food.Vendor
        ? {
          id: food.Vendor.id,
          _id: food.Vendor.id,
          name: food.Vendor.name,
          vendor_name: food.Vendor.name,
          address: food.Vendor.address,
          city: food.Vendor.city,
          rating: Number(food.Vendor.rating),
          image: food.Vendor.image,
          vendorType: food.Vendor.vendorType,
          deliveryTime: food.Vendor.deliveryTime,
          deliveryFee: Number(food.Vendor.deliveryFee)
        }
        : null,

      restaurantId: food.vendorId,
      createdAt: food.createdAt
    }));

    res.json({
      success: true,
      count: foods.length,
      foods
    });

  } catch (err) {
    console.error('getFoods error:', err);
    next(err);
  }
};

// @desc Add new food item
// @route POST /api/foods
const createFoodItem = async (req, res, next) => {
  try {
    const { name, description, price, categoryId, isVeg, image, prepTime, productType, weightOptions, unit, freshnessBadge, discountPrice } = req.body;

    // Find vendor for the logged in user
    const vendor = await prisma.vendor.findFirst({
      where: { ownerUserId: req.user.id }
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const created = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId,
        productType: productType || (vendor.vendorType === 'FRESH' ? 'VEGETABLE' : 'FOOD'),
        name,
        description,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        unit: unit || 'portion',
        weightOptions: weightOptions || null,
        freshnessBadge: freshnessBadge || null,
        isVeg: isVeg === true || isVeg === 'true',
        image: image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300',
        prepTime: prepTime || '15-20 min'
      }
    });

    res.status(201).json({ success: true, food: { ...created, _id: created.id } });
  } catch (err) {
    console.error('createFoodItem error:', err);
    next(err);
  }
};

// @desc Update food item
// @route PUT /api/foods/:id
const updateFoodItem = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json({ success: true, food: { ...updated, _id: updated.id } });
  } catch (err) {
    console.error('updateFoodItem error:', err);
    next(err);
  }
};

// @desc Delete food item
// @route DELETE /api/foods/:id
const deleteFoodItem = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    await prisma.product.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Food item deleted successfully' });
  } catch (err) {
    console.error('deleteFoodItem error:', err);
    next(err);
  }
};

module.exports = {
  getFoods,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem
};
