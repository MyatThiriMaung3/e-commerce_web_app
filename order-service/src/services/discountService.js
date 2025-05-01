const Discount = require('../models/Discount');

/**
 * Validates a discount code.
 * @param {string} code - The discount code to validate.
 * @returns {Promise<object|null>} - The discount object if valid and usable, null otherwise.
 */
const validateDiscountCode = async (code) => {
    // Mongoose findOne is case-sensitive by default for indexed fields like 'code'
    // If case-insensitive check needed, consider using a regex or collation
    // For now, assuming codes are stored/validated consistently (e.g., uppercase)
    const discount = await Discount.findOne({ code: code });

    if (!discount) {
        console.log(`Discount code not found: ${code}`);
        return null; // Code doesn't exist
    }

    if (discount.usedCount >= discount.maxUsage) {
        console.log(`Discount code ${code} has reached its maximum usage limit.`);
        return null; // Code has reached usage limit
    }

    // Code is valid and usable
    return discount;

    // Errors during findOne will be caught by asyncHandler -> errorHandler
};

module.exports = {
    validateDiscountCode
}; 