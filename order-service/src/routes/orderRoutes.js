const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Placeholder
const { validateRequest } = require('../middleware/validationMiddleware'); // Placeholder
const Joi = require('joi');

// --- Joi Schemas for Validation ---

// Schema for Shipping Address (reusable)
const shippingAddressSchema = Joi.object({
    fullName: Joi.string().required(),
    addressLine: Joi.string().required(),
    city: Joi.string().required(),
    zip: Joi.string().required(),
    country: Joi.string().required(),
    phoneNumber: Joi.string().allow('').optional(), // Allow empty string, optional
}).required();

// Schema for Guest Details (optional within checkout)
const guestDetailsSchema = Joi.object({
    email: Joi.string().email().required(),
    fullName: Joi.string().optional(), // If not provided, use shippingAddress.fullName
});

// Schema for Checkout Request Body
const checkoutSchemaValidation = Joi.object({
    shippingAddress: shippingAddressSchema,
    discountCode: Joi.string().trim().uppercase().allow('').optional(), // Optional, allow empty string
    useLoyaltyPoints: Joi.number().integer().min(0).optional().default(0), // Points to use, default 0
    guestDetails: guestDetailsSchema.optional(),
    cartId: Joi.string().hex().length(24).optional(), // Optional, maybe needed for guests
    // Add other fields if necessary, e.g., paymentMethodToken
});

// --- Routes ---

// Routes requiring user authentication
router.use(protect);

// Checkout doesn't strictly require protection if guest checkout is enabled,
// but the controller logic handles userId presence/absence.
// Might apply protect optionally or handle auth state within controller/service.
// For authenticated user checkout, protect middleware MUST run first.
router.post('/checkout', validateRequest(checkoutSchemaValidation), orderController.processCheckout);

router.get('/history', orderController.getOrderHistory);
router.get('/loyalty/balance', orderController.getMyLoyaltyBalance);
router.get('/loyalty/history', orderController.getMyLoyaltyHistory);
router.get('/:orderId', orderController.getOrderDetails);

module.exports = router; 