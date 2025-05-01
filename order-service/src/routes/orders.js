const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth'); // Import authenticate middleware
const validateRequest = require('../middleware/validate');
const { checkoutSchema, orderIdParamSchema } = require('../validation/orderSchemas');

/**
 * @route   POST api/orders/checkout
 * @desc    Process checkout and create an order
 * @access  Private (Requires authentication)
 */
router.post(
    '/checkout',
    authenticate, // Ensure user is logged in
    validateRequest(checkoutSchema, 'body'), // Validate body
    orderController.processCheckout
);

/**
 * @route   GET api/orders/my-history
 * @desc    Get order history for the logged-in user
 * @access  Private
 */
router.get(
    '/my-history',
    authenticate, // Ensure user is logged in
    orderController.getOrderHistory
);

/**
 * @route   GET api/orders/:id
 * @desc    Get specific order details by ID
 * @access  Private (User can only get their own orders, checked in controller/service)
 */
router.get(
    '/:id',
    authenticate, // Ensure user is logged in
    validateRequest(orderIdParamSchema, 'params'), // Validate ObjectId in params
    orderController.getOrderById
);

// Add other order routes here later

module.exports = router; 