const adminOrderService = require('../services/adminOrderService');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// @desc    List all orders (Admin)
// @route   GET /api/orders/admin
// @access  Admin
const getAllOrders = async (req, res, next) => {
    try {
        // Extract filters from query parameters
        const filters = {
            status: req.query.status,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            userId: req.query.userId,
            orderNumber: req.query.orderNumber,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };
        // Extract pagination options
        const paginationOptions = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        };

        const ordersData = await adminOrderService.getAllOrders(filters, paginationOptions);
        res.status(200).json({
            status: 'success',
            data: ordersData,
        });
    } catch (error) {
        logger.error('AdminOrderController: Error in getAllOrders', { metadata: { error: error.message, stack: error.stack, query: req.query } });
        next(error);
    }
};

// @desc    Get specific order details by ID (Admin access)
// @route   GET /api/orders/admin/:orderId
// @access  Admin
const getOrderDetails = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await adminOrderService.getOrderDetailsAsAdmin(orderId);
        res.status(200).json({
            status: 'success',
            data: { order },
        });
    } catch (error) {
        logger.error('AdminOrderController: Error in getOrderDetails', { metadata: { error: error.message, stack: error.stack, params: req.params } });
        next(error);
    }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/admin/:orderId/status
// @access  Admin
const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;
        const adminUserId = req.user?.id; // Get admin ID from auth middleware

        if (!status) {
            return next(new AppError('New status is required.', 400));
        }

        const updatedOrder = await adminOrderService.updateOrderStatus(orderId, status, notes, adminUserId);
        res.status(200).json({
            status: 'success',
            message: `Order status updated to ${status}.`,
            data: { order: updatedOrder },
        });
    } catch (error) {
        logger.error('AdminOrderController: Error in updateOrderStatus', { metadata: { error: error.message, stack: error.stack, params: req.params, body: req.body, adminUserId: req.user?.id } });
        next(error);
    }
};

module.exports = {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
}; 