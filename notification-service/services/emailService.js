const nodemailer = require('nodemailer');
const config = require('../config'); // Load configuration
const logger = require('../config/logger'); // Import logger

// Create a reusable transporter object using the default SMTP transport
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure, // true for 465, false for other ports
        auth: {
            user: config.mail.auth.user,
            pass: config.mail.auth.pass,
        },
        tls: {
            // do not fail on invalid certs (useful for some local/test setups)
            rejectUnauthorized: process.env.NODE_ENV === 'production' // only allow self-signed in dev
        }
    });
    logger.info('Nodemailer transporter created.');
} catch (error) {
    logger.error('Failed to create Nodemailer transporter', { metadata: { error: error } });
    // Handle critical error - maybe exit? For now, log and subsequent calls will fail.
    transporter = null; // Ensure transporter is null if creation fails
}

/**
 * Sends an email.
 * @param {string} to Recipient email address.
 * @param {string} subject Email subject.
 * @param {string} text Plain text body.
 * @param {string} [html] HTML body (optional).
 * @returns {Promise<object>} Nodemailer message info object.
 */
const sendEmail = async (to, subject, text, html = null) => {
    if (!transporter) {
        logger.error('Cannot send email: Nodemailer transporter is not initialized.');
        throw new Error('Email service not available due to transporter initialization failure.');
    }

    const mailOptions = {
        from: config.mail.from, // Sender address
        to: to, // List of receivers
        subject: subject, // Subject line
        text: text, // Plain text body
        html: html, // HTML body (optional)
    };

    try {
        logger.info(`Attempting to send email...`, { metadata: { to, subject } });
        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully', { metadata: { messageId: info.messageId, recipient: to } });
        // logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only available with ethereal.email
        return info;
    } catch (error) {
        logger.error('Error sending email', { metadata: { recipient: to, subject, error: error } });
        throw new Error('Failed to send email.'); // Re-throw or handle as needed
    }
};

// Verify connection configuration on startup (optional but recommended)
if (transporter) {
    transporter.verify(function (error, success) {
        if (error) {
            logger.error('Error verifying email transporter configuration:', { metadata: { error: error } });
        } else {
            logger.info('Email server is ready to take messages');
        }
    });
}

module.exports = {
    sendEmail,
}; 