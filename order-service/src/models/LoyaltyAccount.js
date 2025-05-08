const mongoose = require('mongoose');

const loyaltyAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Conceptual reference to a user in auth-service
        required: true,
        unique: true,
        index: true,
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    // We can add more fields later if needed, e.g., lastTransactionDate
}, {
    timestamps: true, // Adds createdAt and updatedAt
});

// Method to safely update balance (example, might need more complex logic for concurrency)
loyaltyAccountSchema.methods.updateBalance = async function(amount, session) {
    if (this.balance + amount < 0) {
        throw new Error('Insufficient loyalty points balance.');
    }
    this.balance += amount;
    return this.save({ session }); // Pass session for transactions
};

const LoyaltyAccount = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);

module.exports = LoyaltyAccount; 