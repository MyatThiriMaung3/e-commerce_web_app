const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
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
    totalAmount: Number,
    discountId: String,
    discountCode: String,
    discountAmount: Number,
    tax: { type: Number, default: 8 },
    shippingFee: { type: Number, default: 0 },
    finalTotalAmount: Number,
    address: {
        label: String,
        addressLine: String,
        city: String,
        zip: String,
        country: String
    },
    status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered'], default: 'pending' },
    statusHistory: [
        {
            status: String,
            updatedAt: Date
        }
    ],
    loyaltyPointsEarned: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
