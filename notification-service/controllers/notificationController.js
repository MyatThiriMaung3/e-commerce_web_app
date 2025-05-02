const ejs = require('ejs');
const path = require('path');
const { sendEmail } = require('../services/emailService');

/**
 * Handles the request to send an order confirmation email.
 * @param {object} req Express request object.
 * @param {object} res Express response object.
 */
const sendOrderConfirmation = async (req, res) => {
    const { recipientEmail, orderData, userData } = req.body;

    // Basic validation
    if (!recipientEmail || !orderData || !userData) {
        console.error('Missing required data for sending order confirmation:', req.body);
        return res.status(400).json({ message: 'Missing required data: recipientEmail, orderData, and userData.' });
    }

    const orderIdForLog = orderData._id || orderData.orderId || 'unknown';
    console.log(`Processing request to send order confirmation for order ${orderIdForLog} to ${recipientEmail}`);

    try {
        // Define path to the EJS template
        const templatePath = path.join(__dirname, '..', 'views', 'templates', 'orderConfirmation.ejs');

        // Render the EJS template with the provided data
        const htmlContent = await ejs.renderFile(templatePath, { orderData, userData });

        // Define email subject
        const subject = `Order Confirmation - #${orderIdForLog}`;

        // Generate a simple text version (optional, good for email clients that don't render HTML)
        const textContent = `Hello ${userData.name || 'Customer'},\n\nThank you for your order (#${orderIdForLog}). We have received it and will notify you when it ships.\n\nOrder Summary:\n${orderData.items.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n')}\n\nTotal: $${orderData.finalTotalAmount.toFixed(2)}\n\nShipping to:\n${orderData.address.street}\n${orderData.address.city}, ${orderData.address.state} ${orderData.address.zipCode}\n${orderData.address.country}\n\nThanks,\nThe Team`;

        // Send the email using the email service
        await sendEmail(recipientEmail, subject, textContent, htmlContent);

        console.log(`Order confirmation email initiated successfully for order ${orderIdForLog} to ${recipientEmail}`);
        // Send a success response back to the calling service (e.g., order-service)
        res.status(202).json({ message: 'Order confirmation email request accepted.' }); // 202 Accepted is appropriate here

    } catch (error) {
        console.error(`Error processing order confirmation for order ${orderIdForLog}:`, error);
        // Send an error response back
        res.status(500).json({ message: 'Failed to send order confirmation email.', error: error.message });
    }
};

module.exports = {
    sendOrderConfirmation,
}; 