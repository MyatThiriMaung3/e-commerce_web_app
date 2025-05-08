const logger = require('../config/logger'); // Import logger

/**
 * Calculates the tax amount based on a subtotal and a tax rate percentage.
 * @param {number} amount - The amount to calculate tax on (e.g., subtotal after discounts).
 * @param {number} taxRatePercent - The tax rate as a percentage (e.g., 8 for 8%).
 * @returns {number} - The calculated tax amount, rounded to 2 decimal places.
 * @throws {TypeError} if inputs are invalid.
 */
const calculateTaxAmount = (amount, taxRatePercent) => {
    if (typeof amount !== 'number' || typeof taxRatePercent !== 'number' || amount < 0 || taxRatePercent < 0) {
        logger.error('Invalid input for calculateTaxAmount', { metadata: { amount: String(amount), taxRatePercent: String(taxRatePercent) } });
        throw new TypeError('Invalid input for tax calculation: amount and taxRatePercent must be non-negative numbers.');
    }
    const taxDecimal = taxRatePercent / 100;
    const taxAmount = amount * taxDecimal;
    // Round to 2 decimal places to avoid floating point issues
    return parseFloat((Math.round(taxAmount * 100) / 100).toFixed(2)); // Ensure 2 decimal places string then float
};

module.exports = {
    calculateTaxAmount,
}; 