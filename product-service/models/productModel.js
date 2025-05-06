const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String, default: 'default/image.png' },
  variants: [{
    variantName: String,
    extraDescription: String,
    price: Number,
    stock: Number,
    images: [String]
  }],
  tags: [String],
  rating: {
    average: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);