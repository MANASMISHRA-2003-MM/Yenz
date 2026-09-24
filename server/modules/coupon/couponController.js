const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const getCoupons = async (req, res, next) => {
  try {
    const rawCoupons = await prisma.coupon.findMany({ where: { isActive: true } });
    const coupons = formatWithId(rawCoupons);
    res.json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { code, title, discountType, discountValue, minOrderValue, maxDiscount, validUntil, usageLimit } = req.body;
    const rawCoupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        title,
        discountType: discountType || 'PERCENTAGE',
        discountValue: Number(discountValue),
        minOrderValue: minOrderValue ? Number(minOrderValue) : 199,
        maxDiscount: maxDiscount ? Number(maxDiscount) : 120,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: usageLimit ? Number(usageLimit) : 1000
      }
    });
    const coupon = formatWithId(rawCoupon);
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    next(err);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCoupons, createCoupon, deleteCoupon };
