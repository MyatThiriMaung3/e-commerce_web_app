const discountService = require('../services/discountService');
const Joi = require('joi');

// Joi schema for discount code validation
const validateCodeSchema = Joi.object({
    code: Joi.string()
        .alphanum() // As per PRD: 5-char alphanumeric
        .length(5)    // As per PRD: 5-char
        .required()
});

/**
 * Handles validation of a discount code.
 * POST /api/discounts/validate
 * Body: { "code": "ABCDE" }
 */
const validateDiscount = async (req, res) => {
    // 1. Validate input
    const { error, value } = validateCodeSchema.validate(req.body);
    if (error) {
        // Log the validation error for debugging
        console.error("Discount code validation error:", error.details[0].message);
        return res.status(400).json({ message: 'Invalid discount code format.', details: error.details[0].message });
    }

    const { code } = value;

    try {
        // 2. Call the service to validate
        const discount = await discountService.validateDiscountCode(code);

        if (!discount) {
            return res.status(404).json({ message: 'Discount code is invalid or has expired.' });
        }

        // 3. Return success response with discount details (or just validity)
        // Decide what details to return - value might be important for the frontend
        return res.status(200).json({
            message: 'Discount code is valid.',
            code: discount.code,
            value: discount.value,
            // Potentially useful for UI, but maybe not necessary here:
            // maxUsage: discount.maxUsage,
            // remainingUses: discount.maxUsage - discount.usedCount
        });

    } catch (error) {
        console.error(`Error in validateDiscount controller for code ${code}:`, error.message);
        // Use a generic error message for the client
        return res.status(500).json({ message: 'Internal server error while validating discount code.' });
    }
};

module.exports = {
    validateDiscount
}; 