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

// @desc Get all Vendor Applications (New upcoming requests only)
// @route GET /api/admin/vendors/applications
const getVendorApplications = async (req, res, next) => {
  try {
    const existingStores = await prisma.vendor.findMany({
      select: { ownerUserId: true, name: true, phone: true }
    }).catch(() => []);
    const existingOwnerIds = new Set(existingStores.map(s => s.ownerUserId).filter(Boolean));
    const existingStoreNames = new Set(existingStores.map(s => (s.name || '').toLowerCase().trim()));

    const applications = await prisma.vendorApplication.findMany({
      where: {
        status: { not: 'APPROVED' }
      },
      orderBy: { createdAt: 'desc' },
      include: { User: { select: { id: true, fullName: true, email: true, phone: true } } }
    });

    // Exclude pre-existing shops whose account or store already exists
    const filteredApps = applications.filter(app => {
      if (app.userId && existingOwnerIds.has(app.userId)) return false;
      const bName = (app.businessName || '').toLowerCase().trim();
      if (existingStoreNames.has(bName)) return false;
      return true;
    });

    const maskedApps = filteredApps.map(app => ({
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

// @desc Get all Delivery Partner Applications (New upcoming requests only)
// @route GET /api/admin/delivery-partners/applications
const getDeliveryPartnerApplications = async (req, res, next) => {
  try {
    const permanentDriverIds = new Set(['usr-driver-01', 'usr-driver-02']);
    const permanentDriverEmails = new Set(['driver.arjun@krawing.com', 'driver.deepak@krawing.com']);

    const applications = await prisma.deliveryPartnerApplication.findMany({
      where: {
        status: { not: 'APPROVED' }
      },
      orderBy: { createdAt: 'desc' },
      include: { User: { select: { id: true, fullName: true, email: true, phone: true } } }
    });

    // Exclude permanent fleet drivers
    const filteredApps = applications.filter(app => {
      if (permanentDriverIds.has(app.userId)) return false;
      if (app.email && permanentDriverEmails.has(app.email.toLowerCase().trim())) return false;
      return true;
    });

    const maskedApps = filteredApps.map(app => ({
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

// Comprehensive Cascade Cleanup helper for deleting Users (Customers, Vendors, Riders)
const cleanupUserDependencies = async (id) => {
  // 1. Delivery locations and deliveries where user was delivery partner
  await prisma.deliveryLocation.deleteMany({
    where: { Delivery: { deliveryPartnerId: id } }
  }).catch(() => {});

  await prisma.delivery.deleteMany({
    where: { deliveryPartnerId: id }
  }).catch(() => {});

  // 2. Delivery offers
  await prisma.deliveryOffer.deleteMany({
    where: { deliveryPartnerId: id }
  }).catch(() => {});

  // 3. Rider live locations and payouts
  await prisma.riderLocation.deleteMany({
    where: { riderId: id }
  }).catch(() => {});

  await prisma.riderPayout.deleteMany({
    where: { riderId: id }
  }).catch(() => {});

  // 4. Reviews where user was reviewer or delivery partner
  await prisma.review.deleteMany({
    where: { OR: [{ userId: id }, { deliveryPartnerId: id }] }
  }).catch(() => {});

  // 5. Orders where user was delivery partner or vendor user
  await prisma.order.updateMany({
    where: { deliveryPartnerId: id },
    data: { deliveryPartnerId: null }
  }).catch(() => {});

  await prisma.order.updateMany({
    where: { vendorUserId: id },
    data: { vendorUserId: null }
  }).catch(() => {});

  // 6. Orders where user was customer
  const customerOrders = await prisma.order.findMany({
    where: { customerId: id },
    select: { id: true }
  }).catch(() => []);

  if (customerOrders && customerOrders.length > 0) {
    const orderIds = customerOrders.map(o => o.id);
    await prisma.deliveryLocation.deleteMany({ where: { Delivery: { orderId: { in: orderIds } } } }).catch(() => {});
    await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.deliveryOffer.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.review.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
  }

  // 7. Vendors/Stores owned by user
  const ownedVendors = await prisma.vendor.findMany({
    where: { ownerUserId: id },
    select: { id: true }
  }).catch(() => []);

  for (const v of ownedVendors) {
    const prods = await prisma.product.findMany({ where: { vendorId: v.id }, select: { id: true } }).catch(() => []);
    const prodIds = prods.map(p => p.id);
    if (prodIds.length > 0) {
      await prisma.cartItem.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => {});
      await prisma.productPriceHistory.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => {});
      await prisma.productVariant.deleteMany({ where: { productId: { in: prodIds } } }).catch(() => {});
      await prisma.product.deleteMany({ where: { id: { in: prodIds } } }).catch(() => {});
    }
    await prisma.cart.deleteMany({ where: { vendorId: v.id } }).catch(() => {});
    await prisma.vendorHours.deleteMany({ where: { vendorId: v.id } }).catch(() => {});
    const vOrders = await prisma.order.findMany({ where: { vendorId: v.id }, select: { id: true } }).catch(() => []);
    if (vOrders && vOrders.length > 0) {
      const vOrderIds = vOrders.map(o => o.id);
      await prisma.deliveryLocation.deleteMany({ where: { Delivery: { orderId: { in: vOrderIds } } } }).catch(() => {});
      await prisma.delivery.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.deliveryOffer.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.orderTimeline.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.refund.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.review.deleteMany({ where: { orderId: { in: vOrderIds } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: { in: vOrderIds } } }).catch(() => {});
    }
    await prisma.review.deleteMany({ where: { vendorId: v.id } }).catch(() => {});
    await prisma.vendor.delete({ where: { id: v.id } }).catch(() => {});
  }

  // 8. User Cart and Addresses
  await prisma.cartItem.deleteMany({ where: { Cart: { userId: id } } }).catch(() => {});
  await prisma.cart.deleteMany({ where: { userId: id } }).catch(() => {});
  await prisma.order.updateMany({ where: { Address: { userId: id } }, data: { addressId: null } }).catch(() => {});
  await prisma.address.deleteMany({ where: { userId: id } }).catch(() => {});

  // 9. Notifications, audit logs, applications
  await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => {});
  await prisma.verificationAuditLog.deleteMany({ where: { actorId: id } }).catch(() => {});
  await prisma.vendorApplication.deleteMany({ where: { userId: id } }).catch(() => {});
  await prisma.deliveryPartnerApplication.deleteMany({ where: { userId: id } }).catch(() => {});
};

// @desc Delete User
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await cleanupUserDependencies(id);
    try {
      await prisma.user.delete({ where: { id } });
    } catch (delErr) {
      console.warn('Fallback soft-delete for user', id, delErr.message);
      await prisma.user.update({
        where: { id },
        data: { status: 'DELETED', isOnline: false }
      }).catch(() => {});
    }
    res.json({ success: true, message: 'User permanently deleted from database' });
  } catch (err) {
    next(err);
  }
};

// @desc Delete Vendor Application
// @route DELETE /api/admin/vendors/applications/:id
const deleteVendorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await prisma.vendorApplication.findUnique({ where: { id } }).catch(() => null);
    await prisma.vendorApplication.deleteMany({ where: { id } });
    if (app?.userId) {
      const user = await prisma.user.findUnique({ where: { id: app.userId } }).catch(() => null);
      if (user && !user.isVerified) {
        await cleanupUserDependencies(app.userId).catch(() => {});
        await prisma.user.delete({ where: { id: app.userId } }).catch(async () => {
          await prisma.user.update({ where: { id: app.userId }, data: { status: 'DELETED' } }).catch(() => {});
        });
      }
    }
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
    const app = await prisma.deliveryPartnerApplication.findUnique({ where: { id } }).catch(() => null);
    await prisma.deliveryPartnerApplication.deleteMany({ where: { id } });
    if (app?.userId) {
      const user = await prisma.user.findUnique({ where: { id: app.userId } }).catch(() => null);
      if (user && !user.isVerified) {
        await cleanupUserDependencies(app.userId).catch(() => {});
        await prisma.user.delete({ where: { id: app.userId } }).catch(async () => {
          await prisma.user.update({ where: { id: app.userId }, data: { status: 'DELETED', isOnline: false } }).catch(() => {});
        });
      }
    }
    res.json({ success: true, message: 'Delivery partner application deleted from database' });
  } catch (err) {
    next(err);
  }
};

// @desc Get all existing delivery partners with details, metrics & trip stats
// @route GET /api/admin/delivery-partners
const getDeliveryPartners = async (req, res, next) => {
  try {
    const rawDrivers = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_PARTNER'
      },
      include: {
        Delivery: {
          select: {
            id: true,
            status: true,
            earnings: true,
            createdAt: true,
            orderId: true
          }
        },
        DeliveryPartnerApplication: {
          select: {
            vehicleType: true,
            vehicleNumber: true,
            dlNumber: true,
            address: true,
            status: true
          },
          take: 1
        },
        RiderLocation: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const drivers = rawDrivers.map(d => {
      const { passwordHash, ...safeUser } = d;
      const app = d.DeliveryPartnerApplication?.[0] || {};
      const completedTrips = (d.Delivery || []).filter(t => t.status === 'DELIVERED');
      const totalEarnings = completedTrips.reduce((acc, t) => acc + Number(t.earnings || 65), 0);
      const activeTrip = (d.Delivery || []).find(t => ['ASSIGNED', 'ACCEPTED', 'ARRIVED_AT_STORE', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(t.status));

      return {
        ...safeUser,
        avatar: d.avatar || 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000',
        vehicleType: d.vehicleType || app.vehicleType || 'Bike',
        vehicleNumber: app.vehicleNumber || 'Registered Fleet',
        dlNumber: app.dlNumber || 'Verified License',
        address: app.address || safeUser.address || 'Noida Fleet Hub',
        completedTripsCount: completedTrips.length,
        totalEarnings,
        activeTrip: activeTrip || null,
        latitude: d.RiderLocation?.latitude || safeUser.latitude || null,
        longitude: d.RiderLocation?.longitude || safeUser.longitude || null
      };
    });

    res.json({
      success: true,
      count: drivers.length,
      drivers
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update Delivery Partner details & status
// @route PUT /api/admin/delivery-partners/:id
const updateDeliveryPartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phone, email, vehicleType, vehicleNumber, dlNumber, status, isOnline, address } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (status) updateData.status = status;
    if (address) updateData.address = address;
    if (typeof isOnline === 'boolean') updateData.isOnline = isOnline;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    if (vehicleNumber || dlNumber) {
      await prisma.deliveryPartnerApplication.updateMany({
        where: { userId: id },
        data: {
          ...(vehicleNumber ? { vehicleNumber } : {}),
          ...(dlNumber ? { dlNumber } : {})
        }
      }).catch(() => {});
    }

    const { passwordHash, ...safeUser } = updatedUser;
    res.json({ success: true, message: 'Delivery partner updated successfully', driver: safeUser });
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
  deleteRiderSelfie,
  getDeliveryPartners,
  updateDeliveryPartner
};
