const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    value: { type: Number, required: true },
    maxUsage: { type: Number, default: 10 },
    usedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discount', DiscountSchema);