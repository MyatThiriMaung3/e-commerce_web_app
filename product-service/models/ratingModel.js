const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: String, required: true },
    username: String,
    comment: String,
    rating: Number,
    createdAt: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Rating', ratingSchema);