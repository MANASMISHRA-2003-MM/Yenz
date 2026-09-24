const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendorType: {
    type: String,
    enum: ['FOOD_RESTAURANT', 'FRESH_MARKET'],
    default: 'FOOD_RESTAURANT'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  cuisine: [{
    type: String
  }],
  rating: {
    type: Number,
    default: 4.5
  },
  numRatings: {
    type: Number,
    default: 100
  },
  deliveryTime: {
    type: String,
    default: '25-35 min'
  },
  deliveryFee: {
    type: Number,
    default: 30
  },
  priceRange: {
    type: String,
    default: '₹₹'
  },
  isVegOnly: {
    type: Boolean,
    default: false
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    required: true
  },
  bannerImage: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number
  },
  offers: [{
    type: String
  }],
  freshTagline: {
    type: String // E.g., "Direct from Wholesale Mandi"
  }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
