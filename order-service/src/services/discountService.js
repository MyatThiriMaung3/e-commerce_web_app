const Discount = require('../models/Discount');

/**
 * Validates a discount code.
 * @param {string} code - The discount code to validate.
 * @returns {Promise<object|null>} - The discount object if valid and usable, null otherwise.
 */
const validateDiscountCode = async (code) => {
    try {
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

    } catch (error) {
        console.error('Error validating discount code:', error.message);
        // In a real application, consider more specific error handling or re-throwing
        throw new Error('Could not validate discount code due to server error.');
    }
};

module.exports = {
    validateDiscountCode
}; 