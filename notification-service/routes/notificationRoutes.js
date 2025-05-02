const express = require('express');
const { sendOrderConfirmation } = require('../controllers/notificationController');

const router = express.Router();

// Define the route for sending order confirmation emails
// POST /api/notifications/send-order-confirmation
router.post('/send-order-confirmation', sendOrderConfirmation);

// Add other notification-related routes here in the future (e.g., shipping notification)

module.exports = router; 