const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const createReview = async (req, res, next) => {
  try {
    const { orderId, restaurantId, deliveryPartnerId, rating, comment, type } = req.body;

    const rawReview = await prisma.review.create({
      data: {
        orderId,
        userId: req.user.id,
        restaurantId,
        deliveryPartnerId: deliveryPartnerId || null,
        rating: Number(rating),
        comment: comment || '',
        type: type || 'restaurant'
      }
    });

    const review = formatWithId(rawReview);

    // Update restaurant rating average
    if (restaurantId && type !== 'delivery') {
      const allReviews = await prisma.review.findMany({
        where: { restaurantId, type: 'restaurant' }
      });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          numRatings: allReviews.length
        }
      });
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};

const getRestaurantReviews = async (req, res, next) => {
  try {
    const rawReviews = await prisma.review.findMany({
      where: { restaurantId: req.params.restaurantId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reviews = formatWithId(rawReviews);

    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, getRestaurantReviews };
