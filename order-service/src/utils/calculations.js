/**
 * Calculates the tax amount based on a subtotal and a tax rate percentage.
 * @param {number} amount - The amount to calculate tax on (e.g., subtotal after discounts).
 * @param {number} taxRatePercent - The tax rate as a percentage (e.g., 8 for 8%).
 * @returns {number} - The calculated tax amount, rounded to 2 decimal places.
 */
const calculateTaxAmount = (amount, taxRatePercent) => {
    if (typeof amount !== 'number' || typeof taxRatePercent !== 'number' || amount < 0 || taxRatePercent < 0) {
        console.error('Invalid input for calculateTaxAmount:', { amount, taxRatePercent });
        return 0; // Or throw an error
    }
    const taxDecimal = taxRatePercent / 100;
    const taxAmount = amount * taxDecimal;
    // Round to 2 decimal places to avoid floating point issues
    return Math.round(taxAmount * 100) / 100;
};

module.exports = {
    calculateTaxAmount,
}; 