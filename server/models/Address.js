const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Home' }, // Home, Work, Other
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, default: 'Noida' },
    state: { type: String, default: 'Uttar Pradesh' },
    pincode: { type: String, required: true },
    phone: { type: String, default: '' },
    lat: { type: Number, default: 28.5355 },
    lng: { type: Number, default: 77.3910 },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
