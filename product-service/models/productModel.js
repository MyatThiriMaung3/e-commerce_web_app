const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String, default: 'LOGO.png' },
  price: { type: Number, default: 0 },
  totalStock: { type: Number, default: 0 },
  variants: [{
    variantName: String,
    extraDescription: String,
    price: Number,
    stock: Number,
    images: [String]
  }],
  tag: String,
  rating: {
    average: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);