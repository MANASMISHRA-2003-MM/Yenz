const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, lowercase: true },
    icon: { type: String, default: 'Utensils' },
    image: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
