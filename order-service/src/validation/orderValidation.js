const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Schema for a full address object (used for guests)
const addressObjectSchema = Joi.object({
    label: Joi.string().optional().allow('', null),
    addressLine: Joi.string().required().messages({ 'any.required': 'Address line is required' }),
    city: Joi.string().required().messages({ 'any.required': 'City is required' }),
    zip: Joi.string().required().messages({ 'any.required': 'ZIP code is required' }),
    country: Joi.string().required().messages({ 'any.required': 'Country is required' })
});

// Schema for an individual item object (used for guests)
const itemObjectSchema = Joi.object({
    productId: Joi.string().pattern(objectIdPattern).required().messages({
        'string.pattern.base': 'Product ID must be a valid ObjectId',
        'any.required': 'Product ID is required'
    }),
    variantId: Joi.string().pattern(objectIdPattern).required().messages({ // Assuming variantId is also an ObjectId
        'string.pattern.base': 'Variant ID must be a valid ObjectId',
        'any.required': 'Variant ID is required'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
    }),
    // Price and name will be fetched/validated server-side based on productId/variantId
});

const processCheckoutSchema = Joi.object({
    // Fields for logged-in users (guestData is not present)
    shippingAddressId: Joi.when('guestData', {
        is: Joi.exist(),
        then: Joi.forbidden(), // Not allowed if guestData exists
        otherwise: Joi.string().pattern(objectIdPattern).required().messages({
            'string.pattern.base': 'Shipping Address ID must be a valid ObjectId',
            'any.required': 'Shipping Address ID is required for logged-in users'
        })
    }),
    billingAddressId: Joi.when('guestData', {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.string().pattern(objectIdPattern).optional().messages({
            'string.pattern.base': 'Billing Address ID must be a valid ObjectId',
        })
    }),

    // Fields for guest users (guestData is present)
    guestData: Joi.object({
        email: Joi.string().email().required().messages({ 'any.required': 'Guest email is required' }),
        fullName: Joi.string().min(2).max(100).required().messages({ 'any.required': 'Guest full name is required' })
    }).optional(),

    shippingAddress: Joi.when('guestData', {
        is: Joi.exist(),
        then: addressObjectSchema.required().messages({ 'any.required': 'Shipping address is required for guest checkout' }),
        otherwise: Joi.forbidden() // Not allowed if guestData is not present (use shippingAddressId instead)
    }),
    billingAddress: Joi.when('guestData', {
        is: Joi.exist(),
        then: addressObjectSchema.optional(), // Billing address object is optional for guests
        otherwise: Joi.forbidden()
    }),
    items: Joi.when('guestData', {
        is: Joi.exist(),
        then: Joi.array().items(itemObjectSchema).min(1).required().messages({
            'array.min': 'At least one item is required for guest checkout',
            'any.required': 'Items are required for guest checkout'
        }),
        otherwise: Joi.forbidden() // Items come from cart for logged-in users
    }),

    // Common fields
    loyaltyPointsToUse: Joi.number().integer().min(0).optional().default(0),
    discountCode: Joi.string().alphanum().min(3).max(20).optional().allow('', null),
    
    // Optional Payment Info (Order Service is agnostic to payment process)
    paymentTransactionId: Joi.string().optional().allow('', null),
    paymentStatus: Joi.string().valid('succeeded', 'pending', 'failed', 'requires_action').optional(),
})
.or('shippingAddressId', 'guestData') // Requires either shippingAddressId (for logged-in) or guestData (for guest)
.messages({
    'object.missing': 'Either shippingAddressId (for logged-in users) or guestData (for guest checkout) must be provided.'
});

const filterOrderHistorySchema = Joi.object({
    status: Joi.string().valid('pending_payment', 'payment_failed', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled').optional().messages({
        'any.only': 'Status must be one of the allowed values.'
    }),
    dateFrom: Joi.date().iso().optional().messages({
        'date.format': 'dateFrom must be a valid ISO 8601 date.'
    }),
    dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).optional().messages({
        'date.format': 'dateTo must be a valid ISO 8601 date.',
        'date.greater': 'dateTo must be after dateFrom.'
    }),
    searchQuery: Joi.string().trim().min(1).max(100).optional().messages({
        'string.min': 'Search query must be at least 1 character long.',
        'string.max': 'Search query can be at most 100 characters long.'
    }),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(10)
});

const filterAdminOrdersSchema = filterOrderHistorySchema.keys({
    userId: Joi.string().pattern(objectIdPattern).optional().messages({
        'string.pattern.base': 'User ID must be a valid ObjectId'
    })
});

const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid('pending_payment', 'payment_failed', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled').required().messages({
        'any.only': 'Status must be one of the allowed values.',
        'any.required': 'Status is required.'
    }),
    notes: Joi.string().trim().max(500).optional().allow('', null).messages({
        'string.max': 'Notes can be at most 500 characters long.'
    })
});

module.exports = {
    processCheckoutSchema,
    filterOrderHistorySchema,
    filterAdminOrdersSchema,
    updateOrderStatusSchema,
}; 