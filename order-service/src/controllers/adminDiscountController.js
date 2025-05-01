const adminDiscountService = require('../services/adminDiscountService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Create a new discount code
// @route   POST /api/admin/discounts
// @access  Admin
// Note: Validation middleware runs before this
const createDiscount = asyncHandler(async (req, res) => {
    const discountData = req.body; // Already validated
    // Ensure code is uppercase if not handled by Joi/validation
    if (discountData.code) {
        discountData.code = discountData.code.toUpperCase();
    }
    const newDiscount = await adminDiscountService.createDiscount(discountData);
    res.status(201).json(newDiscount);
    // Error handling: Duplicate code errors should be caught by errorHandler
});

// @desc    Get all discount codes
// @route   GET /api/admin/discounts
// @access  Admin
// Note: Add pagination validation if desired
const listDiscounts = asyncHandler(async (req, res) => {
    // Basic pagination (could be validated with Joi in route if needed)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const pagination = { page, limit };

    const result = await adminDiscountService.listAllDiscounts(pagination);
    res.status(200).json(result);
});

module.exports = {
    createDiscount,
    listDiscounts,
}; 