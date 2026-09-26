const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

// Helper to mask sensitive document info
const maskDocumentData = (docs) => {
  if (!docs || typeof docs !== 'object') return docs;
  const masked = { ...docs };
  if (masked.aadhaarNumber) {
    const s = masked.aadhaarNumber.toString();
    masked.aadhaarNumber = s.length >= 4 ? `XXXX XXXX ${s.slice(-4)}` : 'XXXX XXXX XXXX';
  }
  if (masked.accountNumber) {
    const s = masked.accountNumber.toString();
    masked.accountNumber = s.length >= 4 ? `XXXXXX${s.slice(-4)}` : 'XXXXXX';
  }
  return masked;
};

// @desc Get Admin Dashboard Statistics
// @route GET /api/admin/metrics
const getAdminMetrics = async (req, res, next) => {
  try {
    const totalOrders = await prisma.order.count();
    const activeOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY']
        }
      }
    });
    const completedOrders = await prisma.order.count({ where: { status: 'DELIVERED' } });
    const cancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED' } });

    const revenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'DELIVERED' }
    });
    const revenue = Number(revenueResult._sum.totalAmount || 0);

    const activeVendors = await prisma.vendor.count({ where: { status: 'open' } });
    const totalDeliveryPartners = await prisma.user.count({ where: { role: 'DELIVERY_PARTNER' } });
    const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const pendingVendorApps = await prisma.vendorApplication.count({ where: { status: 'PENDING' } });
    const pendingDeliveryApps = await prisma.deliveryPartnerApplication.count({ where: { status: 'PENDING' } });

    res.json({
      success: true,
      metrics: {
        totalOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        revenue,
        activeVendors,
        totalDeliveryPartners,
        totalCustomers,
        pendingVendorApps,
        pendingDeliveryApps
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all users grouped by role or filtered
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let whereClause = {};
    if (role) {
      const uRole = role.toUpperCase();
      if (['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'ADMIN'].includes(uRole)) {
        whereClause.role = uRole;
      }
    }

    const rawUsers = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const users = rawUsers.map(u => {
      const { passwordHash, ...userWithoutPassword } = u;
      return formatWithId(userWithoutPassword);
    });

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc Update user status or role
// @route PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const rawUser = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });

    const { passwordHash, ...userWithoutPassword } = rawUser;
    const user = formatWithId(userWithoutPassword);

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc Admin update product price (creates ProductPriceHistory)
// @route PUT /api/admin/products/:id/price
const updateProductPrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, discountPrice, variantId, reason } = req.body;

    let oldPrice = 0;
    let newPrice = Number(price);

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

      oldPrice = Number(variant.price);
      await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          price: newPrice,
          discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : variant.discountPrice
        }
      });

      await prisma.productPriceHistory.create({
        data: {
          id: crypto.randomUUID(),
          variantId,
          productId: id,
          oldPrice,
          newPrice,
          changedBy: req.user.id,
          reason: reason || 'Admin updated variant price'
        }
      });
    } else {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      oldPrice = Number(product.price);
      await prisma.product.update({
        where: { id },
        data: {
          price: newPrice,
          discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : product.discountPrice
        }
      });

      await prisma.productPriceHistory.create({
        data: {
          id: crypto.randomUUID(),
          productId: id,
          oldPrice,
          newPrice,
          changedBy: req.user.id,
          reason: reason || 'Admin updated product price'
        }
      });
    }

    res.json({ success: true, message: 'Price updated successfully', oldPrice, newPrice });
  } catch (err) {
    next(err);
  }
};

// @desc Get price history for a product or variant
// @route GET /api/admin/products/:id/price-history
const getProductPriceHistory = async (req, res, next) => {
  try {
    const history = await prisma.productPriceHistory.findMany({
      where: {
        OR: [
          { productId: req.params.id },
          { variantId: req.params.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: history.length, history });
  } catch (err) {
    next(err);
  }
};

// @desc Admin update product image URL
// @route PUT /api/admin/products/:id/image
const updateProductImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'Image URL is required' });

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { image }
    });
    res.json({ success: true, message: 'Product image updated', product: formatWithId(updated) });
  } catch (err) {
    next(err);
  }
};

// @desc Create a product variant (Fresh Mandi weights/units)
// @route POST /api/admin/products/:id/variants
const createProductVariant = async (req, res, next) => {
  try {
    const { name, quantity, unit, price, discountPrice, stockQuantity, isAvailable } = req.body;
    const variant = await prisma.productVariant.create({
      data: {
        id: crypto.randomUUID(),
        productId: req.params.id,
        name,
        quantity: Number(quantity || 1),
        unit: unit || 'KG',
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        stockQuantity: stockQuantity ? Number(stockQuantity) : 100,
        isAvailable: isAvailable ?? true
      }
    });
    res.status(201).json({ success: true, variant: formatWithId(variant) });
  } catch (err) {
    next(err);
  }
};

// @desc Get all Vendor Applications
// @route GET /api/admin/vendors/applications
const getVendorApplications = async (req, res, next) => {
  try {
    const applications = await prisma.vendorApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { User: { select: { id: true, fullName: true, email: true, phone: true } } }
    });

    const maskedApps = applications.map(app => ({
      ...app,
      documents: maskDocumentData(app.documents)
    }));

    res.json({ success: true, count: maskedApps.length, applications: maskedApps });
  } catch (err) {
    next(err);
  }
};

// @desc Update Vendor Application Status (Approve / Reject)
// @route PUT /api/admin/vendors/applications/:id/status
const updateVendorApplicationStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const app = await prisma.vendorApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const updatedApp = await prisma.vendorApplication.update({
      where: { id: app.id },
      data: {
        status: status || 'APPROVED',
        adminNotes: adminNotes || app.adminNotes
      }
    });

    // If APPROVED, create Vendor store and assign role VENDOR to applicant
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: app.userId },
        data: { role: 'VENDOR' }
      });

      const existingVendor = await prisma.vendor.findFirst({ where: { ownerUserId: app.userId } });
      if (!existingVendor) {
        await prisma.vendor.create({
          data: {
            id: crypto.randomUUID(),
            ownerUserId: app.userId,
            vendorType: app.vendorType || 'CRAVINGS',
            name: app.businessName,
            phone: app.phone,
            email: app.email,
            address: app.address,
            city: app.city,
            state: app.state,
            pincode: app.pincode,
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
            bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200'
          }
        });
      }
    }

    // Audit log
    await prisma.verificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: req.user.id,
        action: `VENDOR_APPLICATION_${status}`,
        targetId: app.id,
        metadata: { businessName: app.businessName, userId: app.userId }
      }
    });

    res.json({ success: true, message: `Application status updated to ${status}`, application: updatedApp });
  } catch (err) {
    next(err);
  }
};

// @desc Get all Delivery Partner Applications
// @route GET /api/admin/delivery-partners/applications
const getDeliveryPartnerApplications = async (req, res, next) => {
  try {
    const applications = await prisma.deliveryPartnerApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { User: { select: { id: true, fullName: true, email: true, phone: true } } }
    });

    const maskedApps = applications.map(app => ({
      ...app,
      bankDetails: maskDocumentData(app.bankDetails),
      documents: maskDocumentData(app.documents)
    }));

    res.json({ success: true, count: maskedApps.length, applications: maskedApps });
  } catch (err) {
    next(err);
  }
};

// @desc Update Delivery Partner Application Status
// @route PUT /api/admin/delivery-partners/applications/:id/status
const updateDeliveryPartnerApplicationStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const app = await prisma.deliveryPartnerApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const updatedApp = await prisma.deliveryPartnerApplication.update({
      where: { id: app.id },
      data: {
        status: status || 'APPROVED',
        adminNotes: adminNotes || app.adminNotes
      }
    });

    // If APPROVED, update user role to DELIVERY_PARTNER
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: app.userId },
        data: {
          role: 'DELIVERY_PARTNER',
          vehicleType: app.vehicleType || 'Bike'
        }
      });
    }

    // Audit log
    await prisma.verificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: req.user.id,
        action: `DELIVERY_PARTNER_APPLICATION_${status}`,
        targetId: app.id,
        metadata: { fullName: app.fullName, userId: app.userId }
      }
    });

    res.json({ success: true, message: `Delivery partner application status updated to ${status}`, application: updatedApp });
  } catch (err) {
    next(err);
  }
};

// @desc Resolve Dispute
// @route PUT /api/admin/disputes/:orderId
const resolveDispute = async (req, res, next) => {
  try {
    const { status, resolutionNote } = req.body;
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: req.params.orderId },
          { orderNumber: req.params.orderId }
        ]
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await prisma.orderTimeline.create({
      data: {
        id: crypto.randomUUID(),
        orderId: order.id,
        status: order.status,
        note: `Dispute ${status || 'RESOLVED'}: ${resolutionNote || 'Admin resolved dispute'}`
      }
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { OrderTimeline: true }
    });

    res.json({ success: true, message: 'Dispute updated', order: formatWithId(updated) });
  } catch (err) {
    next(err);
  }
};

// @desc Upload Image to Cloudinary
// @route POST /api/admin/upload-image
const uploadImage = async (req, res, next) => {
  try {
    const { uploadToCloudinary } = require('../../utils/cloudinary');
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const result = await uploadToCloudinary(image, folder || 'krawing/media');
    res.json({ success: true, secureUrl: result.secureUrl, publicId: result.publicId });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminMetrics,
  getUsers,
  updateUser,
  updateProductPrice,
  getProductPriceHistory,
  updateProductImage,
  createProductVariant,
  getVendorApplications,
  updateVendorApplicationStatus,
  getDeliveryPartnerApplications,
  updateDeliveryPartnerApplicationStatus,
  resolveDispute,
  uploadImage
};
