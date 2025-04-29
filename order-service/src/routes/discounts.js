const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
// Potential middleware for authentication if needed later
// const auth = require('../middleware/auth');

/**
 * @route   POST api/discounts/validate
 * @desc    Validate a discount code
 * @access  Public (or Private if only logged-in users can check)
 */
router.post('/validate', discountController.validateDiscount);

// Add other discount-related routes here later (e.g., admin routes)

module.exports = router; 