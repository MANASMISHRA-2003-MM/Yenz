const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    status: {
      type: String,
      enum: ['ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'],
      default: 'ASSIGNED'
    },
    earnings: { type: Number, default: 65 },
    distanceKm: { type: Number, default: 3.4 },
    estimatedMinutes: { type: Number, default: 20 },
    currentCoordinates: {
      lat: { type: Number, default: 28.5700 },
      lng: { type: Number, default: 77.3200 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
