const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema for items in the order
const OrderItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        // ref: 'Product', // Reference to Product model (potentially in Product service)
        required: true
    },
    variantId: {
        type: String, // Assuming variantId might not always be an ObjectId if sourced differently
        required: true
    },
    name: { type: String, required: true },
    variantName: { type: String },
    image: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true } // Price per unit at the time of order
}, { _id: false }); // Don't create separate _id for order items

// Sub-schema for the shipping address
const AddressSchema = new Schema({
    label: { type: String },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true }
}, { _id: false }); // Don't create separate _id for address sub-document

// Sub-schema for status history
const StatusHistorySchema = new Schema({
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipping', 'delivered'],
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false }); // Don't create separate _id for status history entries

// Main Order Schema
const OrderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Assuming the User model name is 'User' in Auth service (though relation isn't enforced across DBs)
        required: true,
        index: true // Index for faster lookups by user
    },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true }, // Sum of (item.price * item.quantity)
    discountId: {
        type: String, // Could be ObjectId if Discounts have their own collection
        default: null,
    },
    discountCode: {
        type: String,
        default: null,
    },
    discountAmount: { type: Number, default: 0 },
    tax: {
        type: Number,
        default: 8 // Default tax percentage (e.g., 8%)
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    pointsUsed: { // Added field for loyalty points usage
        type: Number,
        default: 0,
    },
    finalTotalAmount: { type: Number, required: true }, // totalAmount - discountAmount + taxAmount + shippingFee
    address: { type: AddressSchema, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipping', 'delivered'],
        default: 'pending'
    },
    statusHistory: [StatusHistorySchema],
    loyaltyPointsEarned: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add the initial status to the history before saving
OrderSchema.pre('save', function(next) {
    if (this.isNew && this.statusHistory.length === 0) {
        // For new orders, add initial status ONLY if history is empty
        this.statusHistory = [{ status: this.status, updatedAt: this.createdAt }];
    } 
    next();
});

module.exports = mongoose.model('Order', OrderSchema); 