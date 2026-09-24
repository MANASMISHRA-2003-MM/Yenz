const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['consumer', 'vendor', 'delivery_partner', 'admin'],
      default: 'consumer',
    },
    phone: { type: String, default: '' },
    isOnline: { type: Boolean, default: true },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
    currentLocation: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
      addressText: { type: String, default: 'Connaught Place, New Delhi' }
    },
    vehicleType: { type: String, default: 'Bike' }, // For delivery partner
    ratings: { type: Number, default: 4.8 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
