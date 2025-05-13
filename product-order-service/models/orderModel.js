const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: Number,
    items: [
        {
            productId: mongoose.Schema.Types.ObjectId,
            variantId: String,
            name: String,
            variantName: String,
            image: String,
            quantity: Number,
            price: Number
        }
    ],
    totalAmount: { type: Number, default: 0},
    discountId: String,
    discountCode: String,
    discountAmount: { type: Number, default: 0},
    loyaltyPointsAmount: { type: Number, default: 0},
    taxAmount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    finalTotalAmount: { type: Number, default: 0 },
    address: {
        address: String,
        city: String,
        state: String,
        zip: String,
        country: { type: String, default: 'Vietnam' }
    },
    status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered'], default: 'pending' },
    statusHistory: [
        {
            status: String,
            updatedAt: Date
        }
    ],
    loyaltyPointsEarned: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
