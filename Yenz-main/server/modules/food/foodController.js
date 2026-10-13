const crypto = require('crypto');
const prisma = require('../../utils/prisma');

// Normalize ProductUnit string to valid Prisma enum: GRAM, KG, ML, LITRE, PIECE, PACK, PORTION
const normalizeProductUnit = (unit) => {
  if (!unit) return 'KG';
  const u = unit.toString().trim().toUpperCase();
  if (['GM', 'GRAM', 'GRAMS', 'G'].includes(u)) return 'GRAM';
  if (['KG', 'KGS', 'KILOGRAM', 'KILOGRAMS'].includes(u)) return 'KG';
  if (['ML', 'MILLILITRE', 'MILLILITER'].includes(u)) return 'ML';
  if (['LITRE', 'LITER', 'L'].includes(u)) return 'LITRE';
  if (['PIECE', 'PIECES', 'PCS', 'PC'].includes(u)) return 'PIECE';
  if (['PACKET', 'PACKETS', 'PACK', 'PACKS', 'PKT', 'PKTS'].includes(u)) return 'PACK';
  if (['PORTION', 'PORTIONS'].includes(u)) return 'PORTION';
  return 'KG';
};

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

    if (availableOnly === 'true') {
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
    const roleUpper = (req.user?.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Vendors are not permitted to create dishes or products. Only Admin can create dishes.'
      });
    }

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
        const normUnit = normalizeProductUnit(v.unit);
        await prisma.productVariant.create({
          data: {
            id: crypto.randomUUID(),
            productId: createdProd.id,
            name: v.name || `${v.quantity || 1} ${normUnit}`,
            quantity: Number(v.quantity || 1),
            unit: normUnit,
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
      where: { id },
      include: { ProductVariant: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Role-scoped authorization: Vendor can only update availability of own products
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      const myVendor = await prisma.vendor.findFirst({ where: { ownerUserId: req.user.id } });
      if (!myVendor || existing.vendorId !== myVendor.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this product' });
      }
      if (req.body.isAvailable !== undefined) {
        const updated = await prisma.product.update({
          where: { id },
          data: { isAvailable: Boolean(req.body.isAvailable) },
          include: {
            Category: true,
            Vendor: true,
            ProductVariant: true,
            ProductPriceHistory: { orderBy: { createdAt: 'desc' }, take: 20 }
          }
        });
        return res.json({ success: true, food: formatProductObj(updated) });
      }
      return res.status(403).json({
        success: false,
        message: 'Vendors can only toggle item availability (Available / Out of Stock). Dish editing and image uploading are restricted to Admin.'
      });
    }

    const {
      name,
      description,
      price,
      discountPrice,
      categoryId,
      productType,
      unit,
      weightOptions,
      isVeg,
      isAvailable,
      image,
      imagePublicId,
      rating,
      prepTime,
      freshnessBadge,
      stockKg,
      vendorId,
      variants,
      priceChangeReason
    } = req.body;

    // Price change audit log for main product
    if (price !== undefined && Number(price) !== Number(existing.price)) {
      await prisma.productPriceHistory.create({
        data: {
          id: crypto.randomUUID(),
          productId: existing.id,
          oldPrice: Number(existing.price),
          newPrice: Number(price),
          changedBy: req.user.id,
          reason: priceChangeReason || 'Product price updated via management dashboard'
        }
      });
    }

    // Build clean update object for Product model with only valid scalar fields
    const productUpdateData = {};
    if (name !== undefined) productUpdateData.name = name;
    if (description !== undefined) productUpdateData.description = description;
    if (price !== undefined) productUpdateData.price = Number(price);
    if (discountPrice !== undefined) productUpdateData.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (categoryId !== undefined) productUpdateData.categoryId = categoryId;
    if (productType !== undefined) productUpdateData.productType = productType;
    if (unit !== undefined) productUpdateData.unit = unit;
    if (weightOptions !== undefined) productUpdateData.weightOptions = weightOptions;
    if (isVeg !== undefined) productUpdateData.isVeg = Boolean(isVeg);
    if (isAvailable !== undefined) productUpdateData.isAvailable = Boolean(isAvailable);
    if (image !== undefined) productUpdateData.image = image;
    if (imagePublicId !== undefined) productUpdateData.imagePublicId = imagePublicId;
    if (rating !== undefined) productUpdateData.rating = Number(rating);
    if (prepTime !== undefined) productUpdateData.prepTime = prepTime;
    if (freshnessBadge !== undefined) productUpdateData.freshnessBadge = freshnessBadge;
    if (stockKg !== undefined) productUpdateData.stockKg = stockKg !== null && stockKg !== '' ? Number(stockKg) : null;
    if (vendorId !== undefined) productUpdateData.vendorId = vendorId;

    if (Object.keys(productUpdateData).length > 0) {
      await prisma.product.update({
        where: { id },
        data: productUpdateData
      });
    }

    // Synchronize ProductVariant relation records if variants array is passed
    if (Array.isArray(variants)) {
      const existingVariants = existing.ProductVariant || [];
      const existingMap = new Map(existingVariants.map(ev => [ev.id, ev]));
      const processedVariantIds = new Set();

      for (const v of variants) {
        const variantId = v.id || v._id;
        const normalizedUnit = normalizeProductUnit(v.unit);
        const variantPrice = Number(v.price ?? (productUpdateData.price ?? existing.price));
        const variantDiscountPrice = v.discountPrice ? Number(v.discountPrice) : null;
        const variantStock = v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : 100;
        const variantAvailable = Boolean(v.isAvailable ?? true);
        const variantName = v.name || `${v.quantity || 1} ${normalizedUnit}`;

        if (variantId && existingMap.has(variantId)) {
          // Existing variant - record price history if changed
          const oldVar = existingMap.get(variantId);
          if (variantPrice !== Number(oldVar.price)) {
            await prisma.productPriceHistory.create({
              data: {
                id: crypto.randomUUID(),
                variantId: oldVar.id,
                productId: existing.id,
                oldPrice: Number(oldVar.price),
                newPrice: variantPrice,
                changedBy: req.user.id,
                reason: priceChangeReason || 'Variant price updated via product edit'
              }
            });
          }

          await prisma.productVariant.update({
            where: { id: variantId },
            data: {
              name: variantName,
              quantity: Number(v.quantity || 1),
              unit: normalizedUnit,
              price: variantPrice,
              discountPrice: variantDiscountPrice,
              stockQuantity: variantStock,
              isAvailable: variantAvailable
            }
          });
          processedVariantIds.add(variantId);
        } else {
          // New variant
          const createdVariantId = crypto.randomUUID();
          await prisma.productVariant.create({
            data: {
              id: createdVariantId,
              productId: existing.id,
              name: variantName,
              quantity: Number(v.quantity || 1),
              unit: normalizedUnit,
              price: variantPrice,
              discountPrice: variantDiscountPrice,
              stockQuantity: variantStock,
              isAvailable: variantAvailable
            }
          });
          processedVariantIds.add(createdVariantId);
        }
      }

      // Delete any existing variants that were removed in the UI
      for (const oldVar of existingVariants) {
        if (!processedVariantIds.has(oldVar.id)) {
          await prisma.productVariant.delete({
            where: { id: oldVar.id }
          });
        }
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
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
      return res.status(403).json({
        success: false,
        message: 'Vendors are not permitted to delete products. Only Admin can manage catalog products.'
      });
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

    const normalizedUnit = normalizeProductUnit(unit);
    const variant = await prisma.productVariant.create({
      data: {
        id: crypto.randomUUID(),
        productId,
        name: name || `${quantity || 1} ${normalizedUnit}`,
        quantity: Number(quantity || 1),
        unit: normalizedUnit,
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

    const { price, discountPrice, stockQuantity, isAvailable, name, unit, reason } = req.body;

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
        unit: unit !== undefined ? normalizeProductUnit(unit) : existing.unit,
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
