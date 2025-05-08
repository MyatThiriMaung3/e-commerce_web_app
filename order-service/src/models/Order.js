const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

// Sub-schema for items in the order
const OrderItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        // ref: 'Product', // Reference to Product model (potentially in Product service)
        required: true
    },
    variantId: {
        type: Schema.Types.ObjectId,
        // ref: 'Product.variants', // Conceptual reference
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
    fullName: { type: String, required: true }, // Add fullName to address as it might differ from user account
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true, default: 'Country' }, // Default from PRD
    phoneNumber: { type: String }, // Add phoneNumber
    // label: { type: String } // e.g., 'Home', 'Work' - from auth service if used
}, { _id: false }); // Don't create separate _id for address sub-document

// Define the schema for order status history
const statusHistorySchema = new Schema({
    status: {
        type: String,
        required: true,
        enum: ['pending_payment', 'pending', 'confirmed', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    notes: { type: String, trim: true }, // Optional notes for status change
}, { _id: false });

// Main Order Schema
const OrderSchema = new Schema({
    orderNumber: { // Human-readable order number
        type: String,
        unique: true,
        default: function() {
            // Generate a random order number as fallback if AutoIncrement fails
            const timestamp = new Date().getTime().toString().slice(-6);
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `ORD-${timestamp}-${random}`;
        }
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: false, // Allows null for guest orders
        index: true 
    },
    guestId: { // For guest checkouts, could be an email or a session ID
        type: String,
        index: true,
        sparse: true, // Allow nulls and ensure uniqueness only for non-null values
    },
    guestEmail: { type: String, default: null }, // For guest checkouts
    items: [OrderItemSchema],
    shippingAddress: {
        type: AddressSchema,
        required: true,
    },
    billingAddress: { type: AddressSchema, required: true },

    // --- Core Financials & Status ---
    subTotalAmount: { type: Number, required: true, min: 0 }, // Sum of item.price * item.quantity
    discountId: {
        type: Schema.Types.ObjectId,
        ref: 'Discount',
        default: null,
    },
    discountCode: { type: String, trim: true, default: null },
    discountAmount: { type: Number, default: 0 }, // Monetary value of the discount applied
    
    loyaltyPointsSpent: { type: Number, default: 0 }, // Number of loyalty points redeemed
    loyaltyPointsValueSpent: { type: Number, default: 0 }, // Monetary value of loyalty points redeemed
    loyaltyPointsEarned: { type: Number, default: 0 }, // Number of loyalty points earned from this order

    taxAmount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    finalTotalAmount: { type: Number, required: true, min: 0 }, // The grand total to be paid

    paymentMethod: { type: String, default: 'assumed_successful_payment' },
    paymentStatus: { type: String, default: 'paid', enum: ['pending', 'paid', 'failed', 'refunded'] }, // Added 'refunded'
    
    status: {
        type: String,
        enum: ['pending_payment', 'payment_failed', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'], // Added 'refunded'
        default: 'pending_payment',
        index: true 
    },
    statusHistory: [statusHistorySchema],
    notes: { type: String, trim: true }, // General notes about the order by admin or system
}, { timestamps: true }); // Adds createdAt and updatedAt

// Add text index for searching by orderNumber and product names within items
OrderSchema.index({ orderNumber: 'text', "items.name": 'text' });

// Initialize status history when an order is created
OrderSchema.pre('save', function(next) {
    if (this.isNew) {
        // Add initial status to history
        // Ensure statusHistory is an array
        if (!Array.isArray(this.statusHistory)) {
            this.statusHistory = [];
        }
        this.statusHistory.push({ status: this.status, notes: 'Order created' });

        // Recalculate totals to ensure accuracy, especially if some values are preset
        this.subTotalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Ensure discountAmount is a number, default to 0 if null/undefined
        const discountVal = typeof this.discountAmount === 'number' ? this.discountAmount : 0;

        const taxableAmount = this.subTotalAmount - discountVal;
        // Ensure taxAmount is explicitly set, PRD mentions 8%
        this.taxAmount = parseFloat((taxableAmount * 0.08).toFixed(2)); 

        // Ensure shippingFee is a number
        const shipping = typeof this.shippingFee === 'number' ? this.shippingFee : 0;
        // Ensure loyaltyPointsValueSpent is a number
        const loyaltyValueSpent = typeof this.loyaltyPointsValueSpent === 'number' ? this.loyaltyPointsValueSpent : 0;

        this.finalTotalAmount = parseFloat(
            (this.subTotalAmount - discountVal + this.taxAmount + shipping - loyaltyValueSpent).toFixed(2)
        );

        if (this.finalTotalAmount < 0) {
            this.finalTotalAmount = 0; // Ensure total is not negative
        }
    }
    next();
});

// Plugin for auto-incrementing orderNumber if you choose to use simple integers
// Otherwise, generate a more complex order number (e.g., with date/timestamp)
// The PRD implies orderNumber as a field, but not its format.
// Using mongoose-sequence for a simple numeric orderNumber for now.
if (process.env.NODE_ENV !== 'test') { // Avoid issues with in-memory DB for tests if not configured
    OrderSchema.plugin(AutoIncrement, { inc_field: 'orderSequence', id: 'orderNum', start_seq: 1000 });
    OrderSchema.pre('save', function(next){
        if (this.isNew && this.orderSequence) {
            this.orderNumber = `ORD-${String(this.orderSequence).padStart(6, '0')}`;
        }
        next();
    });
}

// Add compound index if needed, e.g., for user + status queries
// OrderSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Order', OrderSchema); 