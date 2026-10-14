const crypto = require('crypto');
const prisma = require('../../utils/prisma');
const { formatWithId, normalizeProductUnit } = require('../../utils/formatters');

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
      return formatWithId({
        ...userWithoutPassword,
        avatar: u.avatar || 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
      });
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
        unit: normalizeProductUnit(unit),
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
      const targetVendorType = (req.body.vendorType && req.body.vendorType.toUpperCase().includes('FRESH'))
        ? 'FRESH'
        : ((app.vendorType && app.vendorType.toUpperCase().includes('FRESH')) ? 'FRESH' : 'CRAVINGS');

      await prisma.user.update({
        where: { id: app.userId },
        data: { role: 'VENDOR', status: 'active' }
      }).catch(err => console.warn('User activate warning:', err.message));

      const existingVendor = await prisma.vendor.findFirst({ where: { ownerUserId: app.userId } });
      if (!existingVendor) {
        let storePhone = app.phone;
        const phoneTaken = await prisma.vendor.findUnique({ where: { phone: storePhone } });
        if (phoneTaken) {
          storePhone = `${storePhone}-${Math.floor(100 + Math.random() * 900)}`;
        }
        await prisma.vendor.create({
          data: {
            id: crypto.randomUUID(),
            ownerUserId: app.userId,
            vendorType: targetVendorType,
            name: app.businessName,
            phone: storePhone,
            email: app.email || null,
            address: app.address || 'Main Market',
            city: app.city || 'Noida',
            state: app.state || 'UP',
            pincode: app.pincode || '201301',
            status: 'open',
            image: targetVendorType === 'FRESH'
              ? 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600'
              : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
            bannerImage: targetVendorType === 'FRESH'
              ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200'
              : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200'
          }
        }).catch(err => console.warn('Vendor store create warning:', err.message));
      } else {
        await prisma.vendor.update({
          where: { id: existingVendor.id },
          data: { vendorType: targetVendorType, status: 'open' }
        }).catch(() => {});
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
    }).catch(() => {});

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

    // If APPROVED, update user role to DELIVERY_PARTNER and activate
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: app.userId },
        data: {
          role: 'DELIVERY_PARTNER',
          status: 'active',
          vehicleType: app.vehicleType || 'Bike'
        }
      }).catch(err => console.warn('Driver activate warning:', err.message));
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

// @desc Get Order Dispatch & Ringing Audit History (For Admin Debugging)
// @route GET /api/admin/orders/:id/dispatch-history
const getOrderDispatchHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id }
        ]
      },
      include: {
        Vendor: true,
        Delivery: {
          include: {
            User: { select: { id: true, fullName: true, phone: true, email: true } }
          }
        },
        DeliveryOffer: {
          include: {
            User: { select: { id: true, fullName: true, phone: true, email: true } }
          },
          orderBy: { offeredAt: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const offers = (order.DeliveryOffer || []).map(off => ({
      offerId: off.id,
      riderId: off.riderId,
      riderName: off.User?.fullName || 'Rider',
      riderPhone: off.User?.phone || '',
      riderEmail: off.User?.email || '',
      distanceToShopKm: Number(off.distanceToShop),
      payout: Number(off.payout),
      status: off.status,
      offeredAt: off.offeredAt,
      expiresAt: off.expiresAt,
      respondedAt: off.respondedAt
    }));

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        shopName: order.Vendor?.name,
        shopCoordinates: {
          latitude: order.pickupLat || order.Vendor?.latitude,
          longitude: order.pickupLng || order.Vendor?.longitude
        },
        assignedDriver: order.Delivery?.User ? {
          id: order.Delivery.User.id,
          name: order.Delivery.User.fullName,
          phone: order.Delivery.User.phone
        } : null,
        vendorHandoverPhoto: order.vendorHandoverPhoto || order.Delivery?.vendorHandoverPhoto || null,
        riderDeliveryPhoto: order.riderDeliveryPhoto || order.Delivery?.riderDeliveryPhoto || null
      },
      dispatchAudit: {
        totalOffersSent: offers.length,
        offers
      }
    });
  } catch (err) {
    next(err);
  }
};

const getRiderSelfies = async (req, res, next) => {
  try {
    const logs = await prisma.verificationAuditLog.findMany({
      where: {
        action: {
          in: ['RIDER_ONLINE_SELFIE', 'RIDER_DELIVERY_PHOTO', 'VENDOR_HANDOVER_PHOTO']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 150
    });

    // Fetch delivery partners & vendors to enrich records with names and phone numbers
    const partnerUsers = await prisma.user.findMany({
      where: {
        role: { in: ['DELIVERY_PARTNER', 'VENDOR', 'RESTAURANT'] }
      },
      select: { id: true, fullName: true, phone: true, avatar: true, updatedAt: true, role: true }
    });
    const userMap = new Map(partnerUsers.map(u => [u.id, u]));

    // Also fetch vendors to map store names
    const vendorStores = await prisma.vendor.findMany({
      select: { id: true, name: true, phone: true, vendorType: true, ownerId: true }
    }).catch(() => []);
    const storeMap = new Map(vendorStores.map(v => [v.ownerId || v.id, v]));

    const isRealPhoto = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (url.includes('icons8')) return false;
      return url.startsWith('data:image') || url.startsWith('http');
    };

    const selfies = [];

    for (const l of logs) {
      const meta = (typeof l.metadata === 'object' && l.metadata !== null) ? l.metadata : {};
      const photo = meta.photo;
      if (isRealPhoto(photo)) {
        const matchedUser = userMap.get(l.actorId);
        const matchedStore = storeMap.get(l.actorId);
        const isShiftSelfie = l.action === 'RIDER_ONLINE_SELFIE';
        const isHandover = l.action === 'VENDOR_HANDOVER_PHOTO';
        const isDeliveryProof = l.action === 'RIDER_DELIVERY_PHOTO';

        let name = meta.riderName || matchedStore?.name || matchedUser?.fullName || (isHandover ? 'Vendor Partner Store' : 'Delivery Partner');
        let phone = meta.phone || matchedStore?.phone || matchedUser?.phone || '';
        let address = meta.addressName || (isShiftSelfie ? 'Live Shift Attendance' : (isHandover ? 'Store Handover Verification' : 'Doorstep Delivery Proof'));

        selfies.push({
          id: l.id,
          actorId: l.actorId,
          action: l.action,
          type: isShiftSelfie ? 'SHIFT_SELFIE' : (isHandover ? 'VENDOR_HANDOVER' : 'DELIVERY_PROOF'),
          createdAt: l.createdAt,
          photo,
          riderName: name,
          phone,
          coords: meta.coords || null,
          addressName: address,
          capturedAt: meta.capturedAt || meta.verifiedAt || l.createdAt,
          source: meta.source || (isHandover ? 'Store Package Camera' : 'Front Camera')
        });
      }
    }

    // Also include any delivery partner who has a real uploaded camera photo in user.avatar
    for (const u of partnerUsers.filter(p => p.role === 'DELIVERY_PARTNER')) {
      const alreadyIncluded = selfies.some(s => s.actorId === u.id);
      if (!alreadyIncluded && isRealPhoto(u.avatar) && (u.avatar.startsWith('data:image') || u.avatar.includes('cloudinary') || u.avatar.includes('unsplash'))) {
        selfies.push({
          id: 'user-avatar-' + u.id,
          actorId: u.id,
          action: 'RIDER_ONLINE_SELFIE',
          type: 'SHIFT_SELFIE',
          createdAt: u.updatedAt,
          photo: u.avatar,
          riderName: u.fullName,
          phone: u.phone,
          coords: null,
          addressName: 'Registered Shift Verification Photo',
          capturedAt: u.updatedAt,
          source: 'Front Camera Verification'
        });
      }
    }

    console.log(`[Admin] getRiderSelfies responding with ${selfies.length} real uploaded verification photo records`);

    res.json({
      success: true,
      count: selfies.length,
      selfies
    });
  } catch (err) {
    console.error('[Admin] getRiderSelfies error:', err);
    next(err);
  }
};

// @desc Delete Rider / Verification Photo (from verification audit log & user avatar in DB)
// @route DELETE /api/admin/delivery-partners/selfies/:id
const deleteRiderSelfie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.query.actorId || req.body?.actorId;

    if (id && !id.startsWith('driver-') && !id.startsWith('user-avatar-')) {
      await prisma.verificationAuditLog.deleteMany({
        where: { id }
      }).catch(err => console.warn('Audit log delete warning:', err.message));
    }

    const targetUserId = actorId || (id.startsWith('driver-') ? id.replace('driver-', '') : (id.startsWith('user-avatar-') ? id.replace('user-avatar-', '') : null));
    if (targetUserId) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000' }
      }).catch(err => console.warn('User avatar reset warning:', err.message));

      await prisma.verificationAuditLog.deleteMany({
        where: { actorId: targetUserId, action: { in: ['RIDER_ONLINE_SELFIE', 'VENDOR_HANDOVER_PHOTO', 'RIDER_DELIVERY_PHOTO'] } }
      }).catch(err => console.warn('Audit logs clear warning:', err.message));
    }

    res.json({ success: true, message: 'Verification photo permanently deleted from database' });
  } catch (err) {
    next(err);
  }
};

// @desc Delete User
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.cart.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.vendorApplication.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.deliveryPartnerApplication.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.verificationAuditLog.deleteMany({ where: { actorId: id } }).catch(() => {});
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'User deleted successfully from database' });
  } catch (err) {
    next(err);
  }
};

// @desc Delete Vendor Application
// @route DELETE /api/admin/vendors/applications/:id
const deleteVendorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.vendorApplication.deleteMany({ where: { id } });
    res.json({ success: true, message: 'Vendor application deleted from database' });
  } catch (err) {
    next(err);
  }
};

// @desc Delete Delivery Partner Application
// @route DELETE /api/admin/delivery-partners/applications/:id
const deleteDeliveryPartnerApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.deliveryPartnerApplication.deleteMany({ where: { id } });
    res.json({ success: true, message: 'Delivery partner application deleted from database' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminMetrics,
  getUsers,
  updateUser,
  deleteUser,
  updateProductPrice,
  getProductPriceHistory,
  updateProductImage,
  createProductVariant,
  getVendorApplications,
  updateVendorApplicationStatus,
  deleteVendorApplication,
  getDeliveryPartnerApplications,
  updateDeliveryPartnerApplicationStatus,
  deleteDeliveryPartnerApplication,
  resolveDispute,
  uploadImage,
  getOrderDispatchHistory,
  getRiderSelfies,
  deleteRiderSelfie
};
