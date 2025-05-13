const express = require('express');
const router = express.Router();
const adminOrderController = require('../../controllers/adminOrderController');
const { protect, adminOnly } = require('../../middleware/authMiddleware'); // Placeholder
const { validateRequest } = require('../../middleware/validationMiddleware'); // Placeholder
const Joi = require('joi');

// Joi schema for query params of GET /orders/admin
const listOrdersQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    status: Joi.string().valid('pending', 'confirmed', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').optional(),
    userId: Joi.string().hex().length(24).optional(),
    orderNumber: Joi.string().trim().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).optional(),
    sortBy: Joi.string().valid('createdAt', 'finalTotalAmount', 'status').optional().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
}).optional(); // Allow empty query

// Joi schema for updating status
const updateStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required(),
    notes: Joi.string().allow('').optional(),
});

// All admin order routes require authentication and admin privileges
router.use(protect, adminOnly);

router.route('/')
    .get(validateRequest(listOrdersQuerySchema, 'query'), adminOrderController.getAllOrders);

router.route('/:orderId')
    .get(adminOrderController.getOrderDetails);

router.route('/:orderId/status')
    .put(validateRequest(updateStatusSchema), adminOrderController.updateOrderStatus);


module.exports = router; 