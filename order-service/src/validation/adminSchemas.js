const Joi = require('joi');
const joiObjectIdUtil = require('../utils/joiObjectId'); // Prefer using the utility
const joiObjectId = require('../utils/joiObjectId'); // Custom validator for ObjectId

// Using joiObjectIdUtil for consistency, or enhance local one with messages.
// const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid Object ID format'); 

const validateDiscountSchema = Joi.object({
    code: Joi.string().alphanum().length(5).required(),
});

// More detailed schema for creating discounts, moved from orderValidation.js
const createDiscountSchema = Joi.object({
    code: Joi.string().trim().alphanum().uppercase().min(3).max(20).required().messages({
        'string.alphanum': 'Discount code must only contain alphanumeric characters.',
        'string.uppercase': 'Discount code must be uppercase.',
        'string.min': 'Discount code must be at least 3 characters long.',
        'string.max': 'Discount code cannot be more than 20 characters long.',
        'any.required': 'Discount code is required.'
    }),
    description: Joi.string().trim().min(5).max(255).required().messages({
        'string.min': 'Description must be at least 5 characters long.',
        'string.max': 'Description cannot be more than 255 characters long.',
        'any.required': 'Description is required.'
    }),
    discountType: Joi.string().valid('percentage', 'fixed_amount').required().messages({
        'any.only': 'Discount type must be either \'percentage\' or \'fixed_amount\'.',
        'any.required': 'Discount type is required.'
    }),
    value: Joi.number().positive().required().messages({
        'number.base': 'Discount value must be a number.',
        'number.positive': 'Discount value must be positive.',
        'any.required': 'Discount value is required.'
    }),
    maxUsage: Joi.number().integer().min(1).optional().allow(null).messages({
        'number.min': 'Maximum usage must be at least 1.'
    }),
    minOrderAmount: Joi.number().min(0).optional().allow(null).messages({
        'number.min': 'Minimum order amount cannot be negative.'
    }),
    startDate: Joi.date().iso().optional().allow(null).messages({
        'date.format': 'Start date must be a valid ISO 8601 date.'
    }),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().allow(null).messages({
        'date.format': 'End date must be a valid ISO 8601 date.',
        'date.greater': 'End date must be after start date if both are provided.'
    }),
    isActive: Joi.boolean().optional() // Defaults to true in the model if not provided
});

const discountIdParamSchema = joiObjectIdUtil('id'); // Using the utility for param 'id'

// Removed adminOrderFilterSchema and updateOrderStatusSchema as they are 
// superseded by more up-to-date versions in orderValidation.js

// Schema for creating/updating discounts (used in adminDiscountRoutes)
const discountSchema = Joi.object({
    code: Joi.string().trim().uppercase().min(3).max(50).required(),
    description: Joi.string().trim().max(255),
    discountType: Joi.string().valid('percentage', 'fixed_amount').required(),
    value: Joi.number().positive().required(),
    maxUsage: Joi.number().integer().min(1).optional().allow(null),
    startDate: Joi.date().iso().optional().allow(null),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().allow(null),
    minPurchaseAmount: Joi.number().min(0).optional().allow(null),
    isActive: Joi.boolean().optional(),
});

// Schema for updating order status (used in adminOrderRoutes)
const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid(
        'pending_payment', 'payment_failed', 'processing', 'confirmed', 
        'shipped', 'delivered', 'cancelled', 'refunded'
    ).required(),
    notes: Joi.string().trim().max(500).optional().allow(''),
});

// Schema for adjusting loyalty points
const adjustLoyaltyPointsSchema = Joi.object({
    targetUserId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Target user ID must be a string',
        'string.hex': 'Target user ID must be a valid hexadecimal ObjectId',
        'string.length': 'Target user ID must be 24 characters long',
        'any.required': 'Target user ID is required.'
    }),
    pointsChange: Joi.number().integer().invalid(0).required().messages({
        'any.required': 'Points change amount is required.',
        'number.base': 'Points change must be a number.',
        'number.integer': 'Points change must be an integer.',
        'any.invalid': 'Points change cannot be zero.'
    }), // Must be non-zero integer (positive or negative)
    reason: Joi.string().trim().min(5).max(255).required().messages({
        'any.required': 'A reason for the adjustment is required.',
        'string.empty': 'Reason cannot be empty.',
        'string.min': 'Reason must be at least 5 characters long.',
        'string.max': 'Reason cannot exceed 255 characters.'
    }),
});

module.exports = {
    validateDiscountSchema,
    createDiscountSchema,
    discountIdParamSchema,
    discountSchema,
    updateOrderStatusSchema,
    adjustLoyaltyPointsSchema,
}; 