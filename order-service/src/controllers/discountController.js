const discountService = require('../services/discountService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Validate a discount code
// @route   POST /api/discounts/validate
// @access  Public
// Note: Validation middleware runs before this
const validateDiscount = asyncHandler(async (req, res) => {
    const { code } = req.body; // Already validated by Joi middleware

    // The service will now throw an error if not found or invalid, caught by errorHandler.
    const discount = await discountService.validateDiscountCode(code);

    // If we reach here, the discount is valid.
    res.status(200).json({
        message: 'Discount code is valid.',
        code: discount.code,
        value: discount.value,
        discountType: discount.discountType
        // Note: Do not expose sensitive details like usage counts unless necessary.
    });
});

module.exports = {
    validateDiscount
}; 