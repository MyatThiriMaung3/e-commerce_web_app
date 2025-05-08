const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect, checkGuestOrUser } = require('../middleware/authMiddleware'); // Assuming authMiddleware.js will be created/exists
const { validateRequest } = require('../middleware/validationMiddleware'); // Assuming validationMiddleware.js for Joi
const Joi = require('joi');

// Schema for adding/updating cart items
const cartItemSchemaValidation = Joi.object({
    productId: Joi.string().hex().length(24).required().messages({
        'string.hex': 'productId must be a valid hexadecimal string',
        'string.length': 'productId must be 24 characters long'
    }),
    variantId: Joi.string().hex().length(24).required().messages({
        'string.hex': 'variantId must be a valid hexadecimal string',
        'string.length': 'variantId must be 24 characters long'
    }),
    quantity: Joi.number().integer().min(1).required(),
});

const updateQuantitySchemaValidation = Joi.object({
    quantity: Joi.number().integer().min(0).required(), // Allow 0 for removal via update
});

// Schema for merging cart
const mergeCartSchemaValidation = Joi.object({
    sessionId: Joi.string().required().min(5).max(100), // Basic validation for sessionId string
});

// Public or User/Guest accessible routes
// The cartController.getCartIdentifier will determine user or guest
router.route('/')
    .get(checkGuestOrUser, cartController.getCart) // checkGuestOrUser to potentially load req.user if token exists
    .delete(checkGuestOrUser, cartController.clearCart); // Allows clearing user or guest cart

router.route('/items')
    .post(checkGuestOrUser, validateRequest(cartItemSchemaValidation), cartController.addItem);

router.route('/items/:cartItemId')
    .put(checkGuestOrUser, validateRequest(updateQuantitySchemaValidation), cartController.updateItemQuantity)
    .delete(checkGuestOrUser, cartController.removeItem);

// Route for merging guest cart to user cart - requires authentication
router.post('/merge', protect, validateRequest(mergeCartSchemaValidation), cartController.mergeCart);

module.exports = router; 