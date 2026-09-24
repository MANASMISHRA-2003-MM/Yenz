const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: 'PERCENTAGE' },
    discountValue: { type: Number, required: true }, // e.g. 20 for 20% or 50 for ₹50
    minOrderValue: { type: Number, default: 199 },
    maxDiscount: { type: Number, default: 120 },
    validUntil: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, default: 1000 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
