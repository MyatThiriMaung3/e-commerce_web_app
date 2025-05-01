const discountService = require('../services/discountService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Validate a discount code
// @route   POST /api/discounts/validate
// @access  Public
// Note: Validation middleware runs before this
const validateDiscount = asyncHandler(async (req, res) => {
    const { code } = req.body; // Already validated by middleware

    const discount = await discountService.validateDiscountCode(code);

    // Service should handle not found/invalid logic by returning null or throwing error
    if (!discount) {
        // Consider if service should throw specific error handled by errorHandler
        return res.status(404).json({ status: 'error', statusCode: 404, message: 'Discount code is invalid, expired, or maximum usage reached.' });
    }

    // Return only necessary info
    res.status(200).json({
        message: 'Discount code is valid.',
        code: discount.code,
        value: discount.value,
        // You might not want to expose usage counts publicly
    });
});

module.exports = {
    validateDiscount
}; 