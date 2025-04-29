const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscountSchema = new Schema({
    code: {
        type: String,
        unique: true,
        required: true // Although schema says unique, making it required makes sense
    },
    value: {
        type: Number,
        required: true
    },
    maxUsage: {
        type: Number,
        default: 10
    },
    usedCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Discount', DiscountSchema); 