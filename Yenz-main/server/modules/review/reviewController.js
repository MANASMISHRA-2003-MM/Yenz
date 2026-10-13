const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const createReview = async (req, res, next) => {
  try {
    const { orderId, vendorId, restaurantId, deliveryPartnerId, rating, comment } = req.body;
    const targetVendorId = vendorId || restaurantId;

    if (!orderId || !targetVendorId || !rating) {
      return res.status(400).json({ success: false, message: 'orderId, vendorId, and rating are required.' });
    }

    const rawReview = await prisma.review.create({
      data: {
        orderId,
        userId: req.user.id,
        vendorId: targetVendorId,
        deliveryPartnerId: deliveryPartnerId || null,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || ''
      }
    });

    const review = formatWithId(rawReview);

    // Update vendor rating average
    if (targetVendorId) {
      const allReviews = await prisma.review.findMany({
        where: { vendorId: targetVendorId }
      });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await prisma.vendor.update({
        where: { id: targetVendorId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          numRatings: allReviews.length
        }
      }).catch(e => console.warn('Vendor rating update warning:', e.message));
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};

const getRestaurantReviews = async (req, res, next) => {
  try {
    const targetVendorId = req.params.restaurantId || req.params.vendorId;
    const rawReviews = await prisma.review.findMany({
      where: { vendorId: targetVendorId },
      include: {
        User_Review_userIdToUser: { select: { id: true, fullName: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reviews = rawReviews.map(r => ({
      ...formatWithId(r),
      user: r.User_Review_userIdToUser ? {
        id: r.User_Review_userIdToUser.id,
        name: r.User_Review_userIdToUser.fullName,
        avatar: r.User_Review_userIdToUser.avatar
      } : null
    }));

    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, getRestaurantReviews };
