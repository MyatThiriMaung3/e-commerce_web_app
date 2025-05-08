const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
    loyaltyAccountId: { // Link to the LoyaltyAccount
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoyaltyAccount',
        required: true,
        index: true,
    },
    userId: { // Denormalized for easier querying, though accountId links it too
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Conceptual reference
        required: true,
        index: true,
    },
    orderId: { // Link to the order that triggered this transaction (if applicable)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        index: true,
        default: null, // Not all transactions might be linked to an order (e.g., manual adjustments)
    },
    pointsChange: {
        type: Number,
        required: true, // Can be positive (earned) or negative (spent/expired/adjusted)
    },
    type: {
        type: String,
        required: true,
        enum: ['earned', 'spent', 'expired', 'correction_add', 'correction_deduct', 'initial_balance'], // 'Earned', 'Spent', 'Expired', 'AdminCorrection', etc.
    },
    description: { // Optional description for the transaction
        type: String,
        trim: true,
    },
    // balanceBefore: { // Optional: Store balance before this transaction
    //     type: Number,
    //     required: false, // Can be useful for auditing
    // },
    // balanceAfter: { // Optional: Store balance after this transaction
    //     type: Number,
    //     required: false, // Can be useful for auditing
    // }
}, {
    timestamps: { createdAt: 'transactionDate', updatedAt: false }, // Use transactionDate for createdAt
});

// Ensure pointsChange is not zero
loyaltyTransactionSchema.path('pointsChange').validate(function(value) {
    return value !== 0;
}, 'Points change cannot be zero.');

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

module.exports = LoyaltyTransaction; 