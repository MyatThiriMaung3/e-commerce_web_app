const express = require('express');
const router = express.Router();
const { listOrders, updateStatus } = require('../../controllers/adminOrderController');
const { authenticate, isAdmin } = require('../../middleware/auth');
const validateRequest = require('../../middleware/validate');
const { orderIdParamSchema } = require('../../validation/orderSchemas');
const { adminOrderFilterSchema, updateOrderStatusSchema } = require('../../validation/adminSchemas');

// Middleware applied to all admin order routes
router.use(authenticate, isAdmin);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders (with filtering and pagination)
 * @access  Private/Admin
 */
router.get('/', validateRequest(adminOrderFilterSchema, 'query'), listOrders);

/**
 * @route   GET /api/admin/orders/:id
 * @desc    Get specific order details by ID (Admin access)
 * @access  Private/Admin
 */
router.get('/:id', validateRequest(orderIdParamSchema, 'params'), getOrderDetails);

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Private/Admin
 */
router.put('/:id/status', validateRequest(orderIdParamSchema, 'params'), validateRequest(updateOrderStatusSchema, 'body'), updateStatus);

module.exports = router; 