const LoyaltyAccount = require('../models/LoyaltyAccount');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const Order = require('../models/Order'); // Needed to link transactions to orders
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// Loyalty Program Constants (as per PRD)
const POINTS_EARN_RATE = 0.10; // 10% of order value (e.g., $100 order earns 10 points)
const LOYALTY_POINT_USD_VALUE = 0.10; // Each point is worth $0.10

/**
 * Get or create a loyalty account for a user.
 * @param {string} userId - The ID of the user.
 * @param {object} [session] - Optional Mongoose session for transactions.
 * @returns {Promise<LoyaltyAccount>} The user's loyalty account.
 */
const getOrCreateLoyaltyAccount = async (userId, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format for loyalty account.', 400);
    }
    let account = await LoyaltyAccount.findOne({ userId }).session(session);
    if (!account) {
        logger.info(`No loyalty account found for userId: ${userId}. Creating new account.`);
        account = new LoyaltyAccount({ userId, balance: 0 });
        await account.save({ session });

        // Create an initial transaction for account creation
        await new LoyaltyTransaction({
            loyaltyAccountId: account._id,
            userId: userId,
            pointsChange: 0,
            type: 'initial_balance',
            description: 'Loyalty account created.',
        }).save({ session });
    }
    return account;
};

/**
 * Award loyalty points for a completed order.
 * This should be called when an order status changes to a point-earning state (e.g., 'delivered').
 * @param {string} orderId - The ID of the order.
 * @param {string} userId - The ID of the user.
 * @param {number} finalTotalAmount - The final total amount of the order.
 * @param {object} [session] - Optional Mongoose session for transactions.
 * @returns {Promise<{account: LoyaltyAccount, transaction: LoyaltyTransaction, pointsAwarded: number}>}
 */
const awardPointsForOrder = async (orderId, userId, finalTotalAmount, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid order or user ID format.', 400);
    }
    if (typeof finalTotalAmount !== 'number' || finalTotalAmount < 0) {
        throw new AppError('Invalid final total amount for awarding points.', 400);
    }

    const account = await getOrCreateLoyaltyAccount(userId, session);
    const pointsToAward = Math.floor(finalTotalAmount * POINTS_EARN_RATE); // Example: 1 point per 10 units of currency, or 10% value

    if (pointsToAward <= 0) {
        logger.info(`No points to award for order ${orderId} with amount ${finalTotalAmount}.`);
        return { account, transaction: null, pointsAwarded: 0 };
    }

    account.balance += pointsToAward;
    await account.save({ session });

    const transaction = new LoyaltyTransaction({
        loyaltyAccountId: account._id,
        userId,
        orderId,
        pointsChange: pointsToAward,
        type: 'earned',
        description: `Points earned for order ${orderId}`,
    });
    await transaction.save({ session });

    logger.info(`${pointsToAward} loyalty points awarded to user ${userId} for order ${orderId}.`);
    return { account, transaction, pointsAwarded };
};

/**
 * Spend loyalty points for an order during checkout.
 * @param {string} userId - The ID of the user.
 * @param {number} pointsToSpend - The number of points to spend.
 * @param {string} orderId - The ID of the order for which points are spent.
 * @param {object} [session] - Optional Mongoose session for transactions.
 * @returns {Promise<{account: LoyaltyAccount, transaction: LoyaltyTransaction, pointsSpent: number, valueSpent: number}>}
 */
const spendPointsForOrder = async (userId, pointsToSpend, orderId, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(orderId)) {
        throw new AppError('Invalid user or order ID format.', 400);
    }
    if (!Number.isInteger(pointsToSpend) || pointsToSpend <= 0) {
        throw new AppError('Points to spend must be a positive integer.', 400);
    }

    const account = await getOrCreateLoyaltyAccount(userId, session);

    if (account.balance < pointsToSpend) {
        throw new AppError(`Insufficient loyalty points. Available: ${account.balance}, Trying to spend: ${pointsToSpend}`, 400);
    }

    // Calculate monetary value BEFORE changing balance, to ensure correct value is reported/used
    const valueSpent = parseFloat((pointsToSpend * LOYALTY_POINT_USD_VALUE).toFixed(2));

    account.balance -= pointsToSpend;
    await account.save({ session });

    const transaction = new LoyaltyTransaction({
        loyaltyAccountId: account._id,
        userId,
        orderId,
        pointsChange: -pointsToSpend, // Negative for spending
        type: 'spent',
        description: `Points spent for order ${orderId}. Value: $${valueSpent.toFixed(2)}`,
        monetaryValue: valueSpent // Store the monetary value of this transaction
    });
    await transaction.save({ session });

    logger.info(`${pointsToSpend} loyalty points spent by user ${userId} for order ${orderId}. Value: $${valueSpent.toFixed(2)}`);
    return { account, transaction, pointsSpent: pointsToSpend, valueSpent };
};

/**
 * Get a user's loyalty points balance.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} The loyalty points balance.
 */
const getLoyaltyBalance = async (userId) => {
    const account = await getOrCreateLoyaltyAccount(userId);
    return account.balance;
};

/**
 * Get a user's loyalty transaction history.
 * @param {string} userId - The ID of the user.
 * @param {object} paginationOptions - Options for pagination { page, limit }.
 * @returns {Promise<object>} Paginated loyalty transactions.
 */
const getLoyaltyHistory = async (userId, paginationOptions = { page: 1, limit: 10 }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format for loyalty history.', 400);
    }
    const { page = 1, limit = 10 } = paginationOptions;
    const skip = (page - 1) * limit;

    // First, ensure the account exists to get the account ID
    const account = await getOrCreateLoyaltyAccount(userId);

    const transactions = await LoyaltyTransaction.find({ loyaltyAccountId: account._id })
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit);

    const totalTransactions = await LoyaltyTransaction.countDocuments({ loyaltyAccountId: account._id });

    return {
        transactions,
        currentPage: page,
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
    };
};

/**
 * (Admin) Manually adjust a user's loyalty points.
 * @param {string} adminUserId - ID of admin performing action (for audit).
 * @param {string} targetUserId - ID of the user whose points are being adjusted.
 * @param {number} pointsChange - Positive to add, negative to deduct.
 * @param {string} reason - Reason for adjustment.
 * @param {object} [session] - Optional Mongoose session for transactions.
 * @returns {Promise<{account: LoyaltyAccount, transaction: LoyaltyTransaction}>}
 */
const adjustPoints = async (adminUserId, targetUserId, pointsChange, reason, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(targetUserId) || (adminUserId && !mongoose.Types.ObjectId.isValid(adminUserId))) {
        throw new AppError('Invalid user ID format for points adjustment.', 400);
    }
    if (!Number.isInteger(pointsChange) || pointsChange === 0) {
        throw new AppError('Points change must be a non-zero integer.', 400);
    }
    if (!reason || reason.trim() === '') {
        throw new AppError('A reason is required for manual point adjustments.', 400);
    }

    const account = await getOrCreateLoyaltyAccount(targetUserId, session);

    if (account.balance + pointsChange < 0) {
        throw new AppError(`Adjustment results in negative balance. Current: ${account.balance}, Change: ${pointsChange}`, 400);
    }

    account.balance += pointsChange;
    await account.save({ session });

    const transactionType = pointsChange > 0 ? 'correction_add' : 'correction_deduct';
    const transaction = new LoyaltyTransaction({
        loyaltyAccountId: account._id,
        userId: targetUserId,
        // orderId: null, // No order associated with manual adjustment
        pointsChange: pointsChange,
        type: transactionType,
        description: `Admin adjustment: ${reason}. By admin: ${adminUserId || 'System'}`,
    });
    await transaction.save({ session });

    logger.info(`Loyalty points for user ${targetUserId} adjusted by ${pointsChange} by admin ${adminUserId || 'System'}. Reason: ${reason}`);
    return { account, transaction };
};

/**
 * Reverses points previously earned or spent for a specific order.
 * Used for cancellations or returns.
 * @param {string} orderId - The ID of the order.
 * @param {string} reason - Reason for reversal (e.g., 'Order Cancelled', 'Item Returned').
 * @param {object} [session] - Optional Mongoose session for transactions.
 * @returns {Promise<{reversedEarnedPoints: number, reversedSpentPoints: number, reversedSpentValue: number}>}
 */
const reversePointsForOrder = async (orderId, reason, session = null) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new AppError('Invalid order ID format for point reversal.', 400);
    }

    const orderTransactions = await LoyaltyTransaction.find({ orderId }).session(session);
    if (!orderTransactions || orderTransactions.length === 0) {
        logger.info(`No loyalty transactions found for order ${orderId}. No points to reverse.`);
        return { reversedEarnedPoints: 0, reversedSpentPoints: 0, reversedSpentValue: 0 };
    }

    let userAccount = null; // Assuming all transactions for an order belong to the same user
    if (orderTransactions.length > 0 && orderTransactions[0].userId) {
        userAccount = await getOrCreateLoyaltyAccount(orderTransactions[0].userId, session);
    }
    if (!userAccount) {
        // This should ideally not happen if transactions exist
        throw new AppError('Could not find user account for order transactions.', 500); 
    }

    let totalEarnedReversed = 0;
    let totalSpentReversed = 0;
    let totalSpentValueReversed = 0;

    for (const tx of orderTransactions) {
        const alreadyReversed = await LoyaltyTransaction.findOne({
            type: 'reversal',
            description: { $regex: `Reversal of tx ${tx._id}` }
        }).session(session);

        if (alreadyReversed) {
            logger.warn(`Transaction ${tx._id} for order ${orderId} seems to be already reversed. Skipping.`);
            continue;
        }

        let reversalPointsChange = 0;
        let reversalDescription = '';
        let reversalMonetaryValue = 0;

        if (tx.type === 'earned') {
            reversalPointsChange = -tx.pointsChange; // Deduct earned points
            userAccount.balance += reversalPointsChange; // (balance = balance - earnedPoints)
            totalEarnedReversed += tx.pointsChange;
            reversalDescription = `Reversal of tx ${tx._id} (earned points). Reason: ${reason}`;
        } else if (tx.type === 'spent') {
            reversalPointsChange = -tx.pointsChange; // Add back spent points (tx.pointsChange is negative for spent)
            userAccount.balance += reversalPointsChange; // (balance = balance + spentPoints)
            totalSpentReversed += (-tx.pointsChange); // Add positive value of points spent
            reversalMonetaryValue = tx.monetaryValue || parseFloat(((-tx.pointsChange) * LOYALTY_POINT_USD_VALUE).toFixed(2)); // Use stored or recalculate
            totalSpentValueReversed += reversalMonetaryValue;
            reversalDescription = `Reversal of tx ${tx._id} (spent points). Value: $${reversalMonetaryValue.toFixed(2)}. Reason: ${reason}`;
        } else {
            logger.info(`Transaction type ${tx.type} for order ${orderId} is not reversible in this context. Skipping tx ${tx._id}.`);
            continue;
        }

        if (reversalPointsChange !== 0) {
            const reversalTransaction = new LoyaltyTransaction({
                loyaltyAccountId: tx.loyaltyAccountId,
                userId: tx.userId,
                orderId: tx.orderId,
                pointsChange: reversalPointsChange,
                type: 'reversal',
                description: reversalDescription,
                monetaryValue: tx.type === 'spent' ? reversalMonetaryValue : undefined, // Store value if it was a spent reversal
                relatedTransactionId: tx._id // Link to original transaction
            });
            await reversalTransaction.save({ session });
            logger.info(`Loyalty transaction ${tx._id} reversed for order ${orderId}. Points change: ${reversalPointsChange}.`);
        }
    }

    if (totalEarnedReversed > 0 || totalSpentReversed > 0) {
        await userAccount.save({ session });
        logger.info(`Total loyalty points reversal for order ${orderId}: Earned Reversed: ${totalEarnedReversed}, Spent Reversed: ${totalSpentReversed} (Value: $${totalSpentValueReversed.toFixed(2)}). User balance updated.`);
    }

    return { 
        reversedEarnedPoints: totalEarnedReversed, 
        reversedSpentPoints: totalSpentReversed, 
        reversedSpentValue: totalSpentValueReversed 
    };
};

module.exports = {
    getOrCreateLoyaltyAccount,
    awardPointsForOrder,
    spendPointsForOrder,
    getLoyaltyBalance,
    getLoyaltyHistory,
    adjustPoints,
    reversePointsForOrder,
    LOYALTY_POINT_USD_VALUE, // Export for use in order calculations
    POINTS_EARN_RATE
}; 