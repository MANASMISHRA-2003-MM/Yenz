// Standardized Delivery Payout Formula
// Base: ₹35 + ₹20/km + ₹15 convenience/fuel (Minimum ₹65)
function calculateDeliveryPayout(distanceKm) {
  const dist = Math.max(0.5, Number(distanceKm) || 1);
  const payout = Math.round(35 + dist * 20 + 15);
  return Math.max(65, payout);
}

module.exports = {
  calculateDeliveryPayout
};
