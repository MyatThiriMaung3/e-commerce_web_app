const express = require('express');
const router = express.Router();
const adminDiscountController = require('../../controllers/adminDiscountController');
const { protect, adminOnly } = require('../../middleware/authMiddleware'); // Assuming adminOnly middleware exists
const { validateRequest } = require('../../middleware/validationMiddleware'); // Placeholder
const Joi = require('joi');

// Joi schema for creating/updating discounts
const discountSchemaValidation = Joi.object({
    code: Joi.string().trim().uppercase().min(3).max(20).required(), // Relaxed from 5-char for general use
    description: Joi.string().allow('').optional(),
    discountType: Joi.string().valid('percentage', 'fixed_amount').required(),
    value: Joi.number().min(0).required(),
    maxUsage: Joi.number().integer().min(1).optional(), // Defaults handled by service/model if needed
    minPurchaseAmount: Joi.number().min(0).optional().default(0),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(), // Optional end date
    isActive: Joi.boolean().optional(),
});

// Schema for updates (make fields optional)
const updateDiscountSchemaValidation = Joi.object({
    code: Joi.string().trim().uppercase().min(3).max(20).optional(),
    description: Joi.string().allow('').optional(),
    discountType: Joi.string().valid('percentage', 'fixed_amount').optional(),
    value: Joi.number().min(0).optional(),
    maxUsage: Joi.number().integer().min(1).optional(),
    minPurchaseAmount: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(),
    isActive: Joi.boolean().optional(),
}).min(1); // Require at least one field to update

// All admin discount routes require authentication and admin privileges
router.use(protect, adminOnly);

router.route('/')
    .post(validateRequest(discountSchemaValidation), adminDiscountController.createDiscount)
    .get(adminDiscountController.getAllDiscounts);

router.route('/:discountId')
    .get(adminDiscountController.getDiscountById)
    .put(validateRequest(updateDiscountSchemaValidation), adminDiscountController.updateDiscount)
    .delete(adminDiscountController.deleteDiscount);

module.exports = router; 