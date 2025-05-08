const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { validateRequest } = require('../middleware/validationMiddleware');
const Joi = require('joi');

// Schema for validating discount code input
const validateDiscountSchema = Joi.object({
    code: Joi.string().trim().uppercase().required().messages({
        'any.required': 'Discount code is required.',
        'string.empty': 'Discount code cannot be empty.'
    })
});

// Public route for validating a discount code
router.post(
    '/validate',
    validateRequest(validateDiscountSchema),
    discountController.validateDiscount
);

module.exports = router; 