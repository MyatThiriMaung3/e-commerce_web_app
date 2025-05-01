const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const validateRequest = require('../middleware/validate');
const { validateDiscountSchema } = require('../validation/adminSchemas'); // Use adminSchemas as it contains discount validation
// Potential middleware for authentication if needed later
// const auth = require('../middleware/auth');

/**
 * @route   POST api/discounts/validate
 * @desc    Validate a discount code
 * @access  Public (Anyone can check a code, but applying it needs checkout context)
 */
router.post(
    '/validate',
    validateRequest(validateDiscountSchema, 'body'), // Validate body
    discountController.validateDiscount
);

// Add other discount-related routes here later (e.g., admin routes)

module.exports = router; 