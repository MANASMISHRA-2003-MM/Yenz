const mongoose = require('mongoose');

const weightOptionSchema = new mongoose.Schema({
  weightLabel: { type: String, required: true }, // e.g. "250g", "500g", "1kg", "2kg"
  price: { type: Number, required: true }
}, { _id: false });

const foodItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  productType: {
    type: String,
    enum: ['FOOD', 'VEGETABLE', 'FRUIT', 'STAPLE'],
    default: 'FOOD'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'portion' // e.g. "kg", "g", "pack", "portion"
  },
  weightOptions: [weightOptionSchema],
  category: {
    type: String,
    required: true
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 4.5
  },
  prepTime: {
    type: String,
    default: '15-20 min'
  },
  freshnessBadge: {
    type: String // e.g. "Arrived 6 AM Today", "Local Mandi Pick", "100% Organic"
  },
  stockKg: {
    type: Number,
    default: 100
  }
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', foodItemSchema);
