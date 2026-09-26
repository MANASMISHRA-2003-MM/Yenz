const crypto = require('crypto');
const prisma = require('../../utils/prisma');

// Helper to format product object for API responses
const formatProductObj = (prod) => {
  if (!prod) return null;

  const variants = (prod.ProductVariant || []).map(v => ({
    _id: v.id,
    id: v.id,
    productId: v.productId,
    name: v.name,
    quantity: Number(v.quantity),
    unit: v.unit,
    price: Number(v.price),
    discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
    stockQuantity: v.stockQuantity ? Number(v.stockQuantity) : null,
    isAvailable: v.isAvailable
  }));

  const priceHistory = (prod.ProductPriceHistory || []).map(h => ({
    id: h.id,
    variantId: h.variantId,
    oldPrice: Number(h.oldPrice),
    newPrice: Number(h.newPrice),
    changedBy: h.changedBy,
    reason: h.reason,
    createdAt: h.createdAt
  }));

  return {
    _id: prod.id,
    id: prod.id,
    name: prod.name,
    description: prod.description || '',
    price: Number(prod.price),
    discountPrice: prod.discountPrice ? Number(prod.discountPrice) : null,
    unit: prod.unit || 'portion',
    weightOptions: prod.weightOptions || null,
    isVeg: Boolean(prod.isVeg),
    isAvailable: Boolean(prod.isAvailable),
    image: prod.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    imagePublicId: prod.imagePublicId || null,
    rating: prod.rating ? Number(prod.rating) : 4.5,
    prepTime: prod.prepTime || '15-20 min',
    freshnessBadge: prod.freshnessBadge || null,
    stockKg: prod.stockKg ? Number(prod.stockKg) : null,
    productType: prod.productType,
    categoryId: prod.categoryId,
    category: prod.Category?.name || '',
    categorySlug: prod.Category?.slug || '',
    vendorId: prod.vendorId,
    restaurantId: prod.vendorId,
    restaurant: prod.Vendor ? {
      _id: prod.Vendor.id,
      id: prod.Vendor.id,
      name: prod.Vendor.name,
      phone: prod.Vendor.phone,
      address: prod.Vendor.address,
      city: prod.Vendor.city,
      rating: Number(prod.Vendor.rating),
      image: prod.Vendor.image,
      imagePublicId: prod.Vendor.imagePublicId || null,
      bannerImage: prod.Vendor.bannerImage || null,
      bannerImagePublicId: prod.Vendor.bannerImagePublicId || null,
      vendorType: prod.Vendor.vendorType,
      deliveryTime: prod.Vendor.deliveryTime,
      deliveryFee: Number(prod.Vendor.deliveryFee)
    } : null,
    variants,
    priceHistory,
    createdAt: prod.createdAt,
    updatedAt: prod.updatedAt
  };
};

// @desc Get all products with filters
// @route GET /api/foods
const getFoods = async (req, res, next) => {
  try {
    const { search, category, isVeg, productType, vendorId, vendorType, availableOnly } = req.query;

    const whereClause = {};

    if (availableOnly !== 'false') {
      whereClause.isAvailable = true;
    }

    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    if (vendorType) {
      const normVendorType = vendorType.toString().toUpperCase().includes('FRESH') ? 'FRESH' : 'CRAVINGS';
      whereClause.Vendor = { vendorType: normVendorType };
    }

    if (productType) {
      const types = productType.split(',').map(t => t.trim());
      if (types.length === 1) {
        whereClause.productType = types[0];
      } else {
        whereClause.productType = { in: types };
      }
    }

    if (isVeg === 'true') {
      whereClause.isVeg = true;
    }

    if (category && category !== 'ALL') {
      whereClause.Category = {
        OR: [
          { name: { contains: category, mode: 'insensitive' } },
          { id: category },
          { slug: { contains: category.toLowerCase(), mode: 'insensitive' } }
        ]
      };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { Category: { name: { contains: search, mode: 'insensitive' } } },
        { Vendor: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const rawFoods = await prisma.product.findMany({
      where: whereClause,
      include: {
        Category: true,
        Vendor: true,
        ProductVariant: true,
        ProductPriceHistory: { orderBy: { createdAt: 'desc' }, take: 10 }
      },
      orderBy: { createdAt: 'desc' }
    });

    const foods = rawFoods.map(formatProductObj);

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

// @desc Get single product by ID
// @route GET /api/foods/:id
const getFoodById = async (req, res, next) => {
  try {
    const rawProd = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        Category: true,
        Vendor: true,
        ProductVariant: true,
        ProductPriceHistory: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!rawProd) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, food: formatProductObj(rawProd) });
  } catch (err) {
    next(err);
  }
};

// @desc Create new product (Admin or Vendor)
// @route POST /api/foods
const createFoodItem = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      categoryId,
      isVeg,
      isAvailable,
      image,
      imagePublicId,
      prepTime,
      productType,
      weightOptions,
      unit,
      freshnessBadge,
      vendorId: inputVendorId,
      variants
    } = req.body;

    let targetVendorId = inputVendorId;

    if (!targetVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { ownerUserId: req.user.id }
      });
      if (vendor) {
        targetVendorId = vendor.id;
      }
    }

    if (!targetVendorId) {
      return res.status(400).json({ success: false, message: 'vendorId is required' });
    }

    let finalImageUrl = image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
    let finalPublicId = imagePublicId || null;

    // Default category if not provided
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const defaultCat = await prisma.category.findFirst();
      finalCategoryId = defaultCat ? defaultCat.id : null;
    }

    const createdProd = await prisma.product.create({
      data: {
        id: crypto.randomUUID(),
        vendorId: targetVendorId,
        categoryId: finalCategoryId,
        productType: productType || 'FOOD',
        name: name || 'New Product',
        description: description || '',
        price: Number(price || 0),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        unit: unit || 'portion',
        weightOptions: weightOptions || null,
        isVeg: Boolean(isVeg ?? true),
        isAvailable: Boolean(isAvailable ?? true),
        image: finalImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
        imagePublicId: finalPublicId || null,
        prepTime: prepTime || '15-20 min',
        freshnessBadge: freshnessBadge || null
      },
      include: {
        Category: true,
        Vendor: true,
        ProductVariant: true
      }
    });

    // Create initial variants if passed
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        await prisma.productVariant.create({
          data: {
            id: crypto.randomUUID(),
            productId: createdProd.id,
            name: v.name || `${v.quantity} ${v.unit}`,
            quantity: Number(v.quantity || 1),
            unit: (v.unit || 'KG').toUpperCase(),
            price: Number(v.price || price),
            discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
            stockQuantity: v.stockQuantity ? Number(v.stockQuantity) : 100,
            isAvailable: Boolean(v.isAvailable ?? true)
          }
        });
      }
    }

    const reloaded = await prisma.product.findUnique({
      where: { id: createdProd.id },
      include: { Category: true, Vendor: true, ProductVariant: true, ProductPriceHistory: true }
    });

    res.status(201).json({ success: true, food: formatProductObj(reloaded) });
  } catch (err) {
    console.error('createFoodItem error:', err);
    next(err);
  }
};

// @desc Update product
// @route PUT /api/foods/:id
const updateFoodItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Role-scoped authorization: Vendor can only update own products
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      const myVendor = await prisma.vendor.findFirst({ where: { ownerUserId: req.user.id } });
      if (!myVendor || existing.vendorId !== myVendor.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this product' });
      }
    }

    const updateData = { ...req.body };

    // Image passed directly as URL string or base64

    // Price change audit log
    if (updateData.price !== undefined && Number(updateData.price) !== Number(existing.price)) {
      await prisma.productPriceHistory.create({
        data: {
          id: crypto.randomUUID(),
          productId: existing.id,
          oldPrice: Number(existing.price),
          newPrice: Number(updateData.price),
          changedBy: req.user.id,
          reason: updateData.priceChangeReason || 'Product price updated via management dashboard'
        }
      });
    }

    delete updateData.priceChangeReason;
    delete updateData._id;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        Category: true,
        Vendor: true,
        ProductVariant: true,
        ProductPriceHistory: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    res.json({ success: true, food: formatProductObj(updated) });
  } catch (err) {
    console.error('updateFoodItem error:', err);
    next(err);
  }
};

// @desc Delete product
// @route DELETE /api/foods/:id
const deleteFoodItem = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      const myVendor = await prisma.vendor.findFirst({ where: { ownerUserId: req.user.id } });
      if (!myVendor || existing.vendorId !== myVendor.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
      }
    }

    await prisma.product.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc Create Product Variant
// @route POST /api/foods/:id/variants
const createProductVariant = async (req, res, next) => {
  try {
    const { name, quantity, unit, price, discountPrice, stockQuantity, isAvailable } = req.body;
    const productId = req.params.id;

    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    const variant = await prisma.productVariant.create({
      data: {
        id: crypto.randomUUID(),
        productId,
        name: name || `${quantity} ${unit}`,
        quantity: Number(quantity || 1),
        unit: (unit || 'KG').toUpperCase(),
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        stockQuantity: stockQuantity ? Number(stockQuantity) : 100,
        isAvailable: Boolean(isAvailable ?? true)
      }
    });

    res.status(201).json({ success: true, variant });
  } catch (err) {
    next(err);
  }
};

// @desc Update Product Variant
// @route PUT /api/foods/variants/:variantId
const updateProductVariant = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });

    if (!existing) return res.status(404).json({ success: false, message: 'Variant not found' });

    const { price, discountPrice, stockQuantity, isAvailable, name, reason } = req.body;

    if (price !== undefined && Number(price) !== Number(existing.price)) {
      await prisma.productPriceHistory.create({
        data: {
          id: crypto.randomUUID(),
          variantId: existing.id,
          productId: existing.productId,
          oldPrice: Number(existing.price),
          newPrice: Number(price),
          changedBy: req.user.id,
          reason: reason || 'Variant price updated via management interface'
        }
      });
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: name !== undefined ? name : existing.name,
        price: price !== undefined ? Number(price) : existing.price,
        discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : existing.discountPrice,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existing.isAvailable
      }
    });

    res.json({ success: true, variant: updated });
  } catch (err) {
    next(err);
  }
};

// @desc Delete Product Variant
// @route DELETE /api/foods/variants/:variantId
const deleteProductVariant = async (req, res, next) => {
  try {
    const { variantId } = req.params;
    await prisma.productVariant.delete({ where: { id: variantId } });
    res.json({ success: true, message: 'Variant deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc Get Product Price History Audit Log
// @route GET /api/foods/:id/price-history
const getProductPriceHistory = async (req, res, next) => {
  try {
    const history = await prisma.productPriceHistory.findMany({
      where: {
        OR: [
          { productId: req.params.id },
          { ProductVariant: { productId: req.params.id } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFoods,
  getFoodById,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductPriceHistory
};
