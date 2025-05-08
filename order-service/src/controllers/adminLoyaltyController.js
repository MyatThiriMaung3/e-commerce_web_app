const loyaltyService = require('../services/loyaltyService');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// @desc    Manually adjust a user's loyalty points
// @route   POST /api/admin/loyalty/adjust
// @access  Admin
const adjustLoyaltyPoints = asyncHandler(async (req, res, next) => {
    const { targetUserId, pointsChange, reason } = req.body;
    const adminUserId = req.user.id; // Provided by 'protect' middleware

    // Validation for pointsChange and reason should be handled by Joi middleware
    // TargetUserId validation (valid ObjectId) should also be handled by Joi

    const { account, transaction } = await loyaltyService.adjustPoints(
        adminUserId,
        targetUserId,
        pointsChange,
        reason
    );

    logger.info('AdminLoyaltyController: Points adjusted successfully', { metadata: { adminUserId, targetUserId, pointsChange } });

    res.status(200).json({
        status: 'success',
        message: `Successfully adjusted points for user ${targetUserId} by ${pointsChange}.`,
        data: {
            newBalance: account.balance,
            transactionId: transaction._id,
        }
    });
});

// Potential future admin endpoints:
// - Get loyalty account details for a specific user
// - List loyalty accounts (with pagination/filtering)
// - Get loyalty transaction history for a specific user (admin view)

module.exports = {
    adjustLoyaltyPoints,
}; 