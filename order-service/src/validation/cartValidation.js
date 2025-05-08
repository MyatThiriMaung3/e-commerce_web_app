const Joi = require('joi');

const addItemSchema = Joi.object({
    productId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Product ID must be a string',
        'string.hex': 'Product ID must be a valid hexadecimal ObjectId',
        'string.length': 'Product ID must be 24 characters long',
        'any.required': 'Product ID is required'
    }),
    variantId: Joi.string().required().messages({
        'string.base': 'Variant ID must be a string',
        'any.required': 'Variant ID is required'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
    })
});

const updateItemSchema = Joi.object({
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
    }),
    // cartItemId will be validated as a param, not in body
});

const cartItemIdSchema = Joi.object({
    cartItemId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Cart Item ID must be a string',
        'string.hex': 'Cart Item ID must be a valid hexadecimal ObjectId',
        'string.length': 'Cart Item ID must be 24 characters long',
        'any.required': 'Cart Item ID is required'
    })
});

module.exports = {
    addItemSchema,
    updateItemSchema,
    cartItemIdSchema,
}; 