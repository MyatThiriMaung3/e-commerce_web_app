const mongoose = require('mongoose');

// Sub-schema for items within the cart
const CartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Assuming a Product model exists or will be referenced from product-service
        required: true,
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: 'Product.variants', // Consider how to reference variants if they are subdocuments
        required: true,
    },
    name: { // Denormalized for easier display
        type: String,
        required: true,
    },
    variantName: { // Denormalized
        type: String,
    },
    image: { // Denormalized
        type: String,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    priceAtAdd: { // Price at the time of adding to cart, to handle price fluctuations
        type: Number,
        required: true,
    },
    // Store any other relevant denormalized product/variant details if needed
}, { _id: true }); // Ensure cart items get their own _id for easier updates/deletes

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming a User model will be referenced from auth-service
        required: false, // No longer strictly required
        index: true,
        sparse: true,    // Ensures uniqueness for actual userIds, allows multiple nulls if using sessionId
        // unique: true, // Removed: A user might have an old session cart temporarily until merge
    },
    sessionId: { // For guest users
        type: String,
        required: false,
        index: true,
        unique: true,
        sparse: true, // Ensures uniqueness for actual sessionIds, allows multiple nulls if using userId
    },
    items: [CartItemSchema],
    lastUpdatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Virtual for total cart price (can be calculated on the fly or stored if performance is critical)
CartSchema.virtual('totalPrice').get(function() {
    return this.items.reduce((total, item) => total + (item.quantity * item.priceAtAdd), 0);
});

// Validation: Ensure either userId or sessionId is present, but not both.
CartSchema.pre('save', function(next) {
    this.lastUpdatedAt = Date.now(); // Keep this from original pre-save

    if (!this.userId && !this.sessionId) {
        return next(new Error('Cart must have either a userId or a sessionId.'));
    }
    if (this.userId && this.sessionId) {
        return next(new Error('Cart cannot have both a userId and a sessionId.'));
    }
    next();
});

CartSchema.pre('findOneAndUpdate', function(next) {
    this.set({ lastUpdatedAt: Date.now() });
    next();
});

const Cart = mongoose.model('Cart', CartSchema);

module.exports = Cart; 