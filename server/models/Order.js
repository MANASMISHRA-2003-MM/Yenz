const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  selectedWeight: {
    type: String,
    default: null // e.g. "500g", "1kg"
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  isVeg: {
    type: Boolean,
    default: true
  }
});

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: String
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  orderType: {
    type: String,
    enum: ['FOOD', 'FRESH'],
    default: 'FOOD'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: [
      'PLACED',
      'VENDOR_ACCEPTED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'COURIER_ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ],
    default: 'PLACED'
  },
  address: {
    title: String,
    street: { type: String, required: true },
    area: String,
    city: { type: String, required: true },
    state: String,
    pincode: String,
    phone: String,
    lat: Number,
    lng: Number
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'CARD', 'UPI', 'WALLET'],
    default: 'UPI'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'COMPLETED'
  },
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 30
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryNotes: String,
  courierLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  timeline: [timelineSchema]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
