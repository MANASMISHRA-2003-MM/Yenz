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
    avatar: { type: String, default: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000' },
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
