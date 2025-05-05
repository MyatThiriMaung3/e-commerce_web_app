const express = require('express');
const router = express.Router();
const adminDiscountController = require('../../controllers/adminDiscountController');
const { authenticate, isAdmin } = require('../../middleware/auth');
const validateRequest = require('../../middleware/validate');
const { createDiscountSchema } = require('../../validation/adminSchemas');

// All routes in this file require authentication and admin privileges
router.use(authenticate, isAdmin);

/**
 * @route   POST api/admin/discounts
 * @desc    Create a new discount code (admin)
 * @access  Private (Admin only)
 */
router.post(
    '/',
    validateRequest(createDiscountSchema, 'body'), // Validate body
    adminDiscountController.createDiscount
);

/**
 * @route   GET api/admin/discounts
 * @desc    Get all discount codes (admin)
 * @access  Private (Admin only)
 */
router.get(
    '/',
    adminDiscountController.listDiscounts
    // Add validation for query params (pagination/filtering) if needed
);

// @route   DELETE api/admin/discounts/:id
// @desc    Delete a discount code (Optional - not explicitly required by PRD)
// @access  Admin
// router.delete(
//     '/:id',
//     validateRequest(discountIdParamSchema, 'params'), // Validate ObjectId in params
//     adminDiscountController.deleteDiscount
// );

module.exports = router; 