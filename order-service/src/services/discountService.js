const Discount = require('../models/Discount');
const logger = require('../config/logger');

// Define a simple error for this service, or use a common error utility
class DiscountValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscountValidationError';
        this.statusCode = 400; // Or 404 if specifically not found
    }
}

/**
 * Validates a discount code.
 * @param {string} code - The discount code to validate.
 * @returns {Promise<object>} - The discount object if valid and usable.
 * @throws {DiscountValidationError} - If the code is invalid, not found, or not usable.
 */
const validateDiscountCode = async (code) => {
    const discount = await Discount.findOne({ code: code.toUpperCase() }); // Ensure code is uppercase for query

    if (!discount) {
        logger.warn(`Discount code not found: ${code}`);
        throw new DiscountValidationError(`Discount code "${code}" not found.`);
    }

    if (!discount.isValid) {
        logger.warn(`Discount code "${code}" is not valid (inactive, expired, or max usage reached).`);
        throw new DiscountValidationError(`Discount code "${code}" is not currently valid or has reached its usage limit.`);
    }

    logger.info(`Discount code "${code}" validated successfully.`);
    return discount;
};

module.exports = {
    validateDiscountCode,
    DiscountValidationError // Export error if it's to be specifically caught elsewhere, though errorHandler handles by name/instanceof
}; 