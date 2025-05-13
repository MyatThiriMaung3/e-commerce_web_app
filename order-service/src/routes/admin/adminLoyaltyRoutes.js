const express = require('express');
const router = express.Router();
const adminLoyaltyController = require('../../controllers/adminLoyaltyController');
const { protect, adminOnly } = require('../../middleware/authMiddleware');
const { validateRequest } = require('../../middleware/validationMiddleware');
const { adjustLoyaltyPointsSchema } = require('../../validation/adminSchemas');

// Protect all admin loyalty routes
router.use(protect, adminOnly);

// Route for adjusting points
router.post(
    '/adjust',
    validateRequest(adjustLoyaltyPointsSchema),
    adminLoyaltyController.adjustLoyaltyPoints
);

// Add other admin loyalty routes here later if needed
// e.g., router.get('/accounts', adminLoyaltyController.listAccounts);
// e.g., router.get('/accounts/:userId', adminLoyaltyController.getAccountDetails);

module.exports = router; 