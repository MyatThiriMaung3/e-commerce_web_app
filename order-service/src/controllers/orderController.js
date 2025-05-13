const orderService = require('../services/orderService');
const loyaltyService = require('../services/loyaltyService'); // For getting balance, history if separate endpoints needed
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

/**
 * Handles the checkout request.
 * POST /api/orders/checkout
 * Body can vary for logged-in vs guest users, validated by orderValidation.processCheckoutSchema
 */
const processCheckout = async (req, res, next) => {
    try {
        const userId = req.user?.id; // Can be null for guest checkout
        const checkoutData = req.body;
        const guestSessionId = req.headers['x-session-id']; // Extract session ID from header

        // Validate required fields for checkoutData
        if (!checkoutData.shippingAddress) {
            return next(new AppError('Shipping address is required for checkout.', 400));
        }
        // Add more specific validation for shippingAddress fields if needed here or via Joi

        // If it's a guest checkout and userId is null, guestDetails must be present
        if (!userId && (!checkoutData.guestDetails || !checkoutData.guestDetails.email)) {
            return next(new AppError('Guest email is required for guest checkout if not logged in.', 400));
        }
        // Also, for guests, cartId might be expected if not inferring from session or another mechanism
        // The orderService.processCheckout handles some of this logic now.

        const order = await orderService.processCheckout(userId, guestSessionId, checkoutData);

        res.status(201).json({
            status: 'success',
            message: 'Order placed successfully.',
            data: {
                order,
            },
        });
    } catch (error) {
        logger.error('OrderController: Error in processCheckout', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, body: req.body } });
        next(error);
    }
};

/**
 * Handles retrieving the order history for the authenticated user.
 * GET /api/orders/my-history
 * Query Params: status?, dateFrom?, dateTo?, page?, limit?
 */
const getOrderHistory = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(new AppError('User authentication required to view order history.', 401));
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const history = await orderService.getOrderHistory(userId, { page, limit });

        res.status(200).json({
            status: 'success',
            data: history, // Contains orders, currentPage, totalPages, totalOrders
        });
    } catch (error) {
        logger.error('OrderController: Error in getOrderHistory', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, query: req.query } });
        next(error);
    }
};

/**
 * Handles retrieving the details of a specific order for the authenticated user.
 * GET /api/orders/:orderId
 */
const getOrderDetails = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(new AppError('User authentication required to view order details.', 401));
        }
        const { orderId } = req.params;

        const order = await orderService.getOrderDetails(userId, orderId);

        res.status(200).json({
            status: 'success',
            data: {
                order,
            },
        });
    } catch (error) {
        logger.error('OrderController: Error in getOrderDetails', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, params: req.params } });
        next(error);
    }
};

// --- Loyalty Points Specific Endpoints (User-facing) ---

const getMyLoyaltyBalance = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(new AppError('User authentication required to view loyalty balance.', 401));
        }
        const balance = await loyaltyService.getLoyaltyBalance(userId);
        res.status(200).json({
            status: 'success',
            data: {
                userId,
                balance,
                // Could add value equivalent: balance * loyaltyService.POINT_TO_VND_CONVERSION_RATE
            },
        });
    } catch (error) {
        logger.error('OrderController: Error in getMyLoyaltyBalance', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id } });
        next(error);
    }
};

const getMyLoyaltyHistory = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(new AppError('User authentication required to view loyalty history.', 401));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const history = await loyaltyService.getLoyaltyHistory(userId, { page, limit });
        res.status(200).json({
            status: 'success',
            data: history, // Contains transactions, currentPage, totalPages, totalTransactions
        });
    } catch (error) {
        logger.error('OrderController: Error in getMyLoyaltyHistory', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, query: req.query } });
        next(error);
    }
};

module.exports = {
    processCheckout,
    getOrderHistory,
    getOrderDetails,
    getMyLoyaltyBalance,
    getMyLoyaltyHistory,
}; 