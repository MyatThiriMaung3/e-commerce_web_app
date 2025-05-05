const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid Object ID format');

const validateDiscountSchema = Joi.object({
    code: Joi.string().alphanum().length(5).required(),
});

const createDiscountSchema = Joi.object({
    code: Joi.string().alphanum().length(5).uppercase().required(),
    description: Joi.string().required(),
    discountType: Joi.string().valid('percentage', 'fixed_amount').required(),
    value: Joi.number().positive().required(),
    maxUsage: Joi.number().integer().min(1).allow(null).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(),
    isActive: Joi.boolean().default(true),
    minimumPurchaseAmount: Joi.number().positive().allow(null).optional()
});

const discountIdParamSchema = Joi.object({
    id: objectId.required(),
});

// Schema for filtering admin orders (example)
const adminOrderFilterSchema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipping', 'delivered').optional(),
    userId: objectId.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(), // Add specific sort validation if needed
}).with('endDate', 'startDate'); // Requires startDate if endDate is provided

// Schema for updating order status
const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipping', 'delivered').required(),
});

module.exports = {
    validateDiscountSchema,
    createDiscountSchema,
    discountIdParamSchema,
    adminOrderFilterSchema,
    updateOrderStatusSchema
}; 