const express = require('express');
// const { sendOrderConfirmation } = require('../controllers/notificationController'); // Controller no longer needed for this route

const router = express.Router();

// REMOVED: Direct HTTP route is replaced by AMQP consumer
// // POST /api/notifications/send-order-confirmation
// router.post('/send-order-confirmation', sendOrderConfirmation);

// Add other notification-related HTTP routes here in the future if needed (e.g., status checks?)

module.exports = router; 