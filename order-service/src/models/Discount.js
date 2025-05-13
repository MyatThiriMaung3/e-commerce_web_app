const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        minlength: 5,
        maxlength: 20, // As per PRD "5-character alphanumeric code", but also allow flexibility. Plan implies this is just an example.
        // Consider a regex for more specific format if needed: /^[A-Z0-9]{5,20}$/
    },
    description: {
        type: String,
        trim: true,
    },
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed_amount'], // e.g., 10% off, or $5 off
    },
    value: {
        type: Number,
        required: true,
        min: 0,
    },
    maxUsage: {
        type: Number,
        required: true,
        default: 10, // As per README_Orders_Notifications.mdc
        min: 1,
    },
    usedCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        validate: {
            validator: function(value) {
                return value <= this.maxUsage;
            },
            message: 'Used count cannot exceed maximum usage.'
        }
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    startDate: {
        type: Date,
        // default: Date.now // Uncomment if discounts should be active immediately by default
    },
    endDate: {
        type: Date, // No expiration date as per README_Orders_Notifications
    },
    minPurchaseAmount: {
        type: Number,
        default: 0, // Minimum purchase amount to apply discount
    },
    // applicableTo: { // Future: for specific products/categories
    //    type: String,
    //    enum: ['all', 'specific_products', 'specific_categories'],
    //    default: 'all'
    // },
    // applicableIds: [mongoose.Schema.Types.ObjectId]
}, {
    timestamps: true, // Adds createdAt and updatedAt
});

// Virtual to check if discount is currently valid (active and within date range if specified)
discountSchema.virtual('isValid').get(function() {
    const now = new Date();
    let valid = this.isActive && this.usedCount < this.maxUsage;
    if (this.startDate && this.startDate > now) {
        valid = false;
    }
    // endDate is not a strict requirement from the docs, but if it were set:
    // if (this.endDate && this.endDate < now) {
    //     valid = false;
    // }
    return valid;
});

// Ensure code is uppercase before saving
discountSchema.pre('save', function(next) {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase();
    }
    // Ensure value is positive for percentage discounts and not > 100
    if (this.discountType === 'percentage' && (this.value <= 0 || this.value > 100)) {
        return next(new Error('Percentage discount value must be between 1 and 100.'));
    }
    if (this.discountType === 'fixed_amount' && this.value <= 0) {
        return next(new Error('Fixed amount discount value must be positive.'));
    }
    next();
});

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount; 