const orderService = require('../services/orderService');
const Joi = require('joi');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Need JWT for local verification attempt
require('dotenv').config(); // For JWT_SECRET
const asyncHandler = require('../middleware/asyncHandler');

// --- Joi Schemas for Validation ---

// Schema for individual items in the order
const orderItemSchema = Joi.object({
    productId: Joi.string().required(), // Assuming ObjectId is passed as string
    variantId: Joi.string().required(), // Assuming ObjectId is passed as string
    name: Joi.string().required(),
    variantName: Joi.string().allow('', null), // Optional
    image: Joi.string().allow('', null),     // Optional
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().positive().required() // Price at time of adding to cart/checkout
});

// Schema for the shipping address
const addressSchema = Joi.object({
    label: Joi.string().allow('', null),       // Optional
    addressLine: Joi.string().required(),
    city: Joi.string().required(),
    zip: Joi.string().required(),
    country: Joi.string().required()
});

// Updated schema for checkout body - includes guest info
const checkoutSchema = Joi.object({
    guestData: Joi.object({
        email: Joi.string().email().required(),
        fullName: Joi.string().required(),
    }).optional(), // Required only if not logged in
    items: Joi.array().items(orderItemSchema).min(1).required(),
    address: addressSchema.required(),
    discountCode: Joi.string().alphanum().length(5).optional().allow('', null),
    pointsToUse: Joi.number().integer().min(0).optional().default(0), // Added pointsToUse
    // Guest info - required if not authenticated
    guestEmail: Joi.string().email(),
    guestName: Joi.string() // Name is optional for guest according to PRD user creation
}).when(Joi.object({ guestEmail: Joi.exist() }).unknown(), {
    // If guestEmail exists, ensure guestName is string (even if empty)
    then: Joi.object({ guestName: Joi.string().allow('', null) })
});

/**
 * Handles the checkout request.
 * POST /api/orders/checkout
 * Body: { items: [...], address: {...}, discountCode?: "...", guestEmail?: "...", guestName?: "..." }
 * Requires Authentication (userId from token)
 */
const processCheckout = asyncHandler(async (req, res) => {
    // User ID might be null if it's a guest
    const userId = req.user?.userId || null;
    // Auth token is needed for logged-in user actions (fetching details, updating points)
    const authToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;

    // Extract validated data
    const { addressId, discountCode, pointsToUse, guestData } = req.body;

    // Prepare data for the service
    const checkoutData = {
        userId,
        guestData: userId ? null : guestData, // Only pass guestData if userId is null
        addressId,
        discountCode,
        pointsToUse,
        authToken,
    };

    const newOrder = await orderService.processCheckout(checkoutData);
    res.status(201).json(newOrder);
});

/**
 * Handles retrieving the order history for the authenticated user.
 * GET /api/orders/my-history
 * Requires Authentication
 */
const getOrderHistory = asyncHandler(async (req, res) => {
    const userId = req.user.userId; // CORRECTED: Use userId from JWT payload
    const orders = await orderService.getOrderHistory(userId);
    res.status(200).json(orders);
});

/**
 * Handles retrieving the details of a specific order for the authenticated user.
 * GET /api/orders/:id
 * Requires Authentication
 */
const getOrderById = asyncHandler(async (req, res) => {
    const userId = req.user.userId; // CORRECTED: Use userId from JWT payload
    const orderId = req.params.id; // Validated to be ObjectId format

    const order = await orderService.getOrderById(orderId, userId);

    // Service should handle not found/unauthorized access
    // The errorHandler will catch CastError if service throws it for invalid ID format
    // that somehow bypasses Joi (unlikely but good practice)
    res.status(200).json(order); // Service throws error if not found/unauthorized
});

module.exports = {
    processCheckout,
    getOrderHistory,
    getOrderById,
    // Add other order controller functions here
}; 