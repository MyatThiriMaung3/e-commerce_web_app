const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscountSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true, // Ensure discount codes are unique
        uppercase: true,
        trim: true,
        index: true // Index for faster validation lookups
    },
    description: {
        type: String,
        required: true,
    },
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed_amount'], // e.g., 10% off or $5 off
    },
    value: {
        type: Number,
        required: true, // The percentage (e.g., 10) or fixed amount (e.g., 5)
    },
    maxUsage: {
        type: Number,
        default: null, // null means unlimited usage
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    endDate: {
        type: Date,
        default: null, // null means no expiration date
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    // Add conditions if needed, e.g., minimum purchase amount
    minimumPurchaseAmount: {
        type: Number,
        default: null,
    },
}, { timestamps: true });

// Check if discount is currently valid (date range and active status)
DiscountSchema.methods.isValid = function() {
    const now = new Date();
    const isDateValid = (!this.startDate || this.startDate <= now) && (!this.endDate || this.endDate >= now);
    const isUsageValid = (this.maxUsage === null || this.usedCount < this.maxUsage);
    return this.isActive && isDateValid && isUsageValid;
};

module.exports = mongoose.model('Discount', DiscountSchema); 