const nodemailer = require('nodemailer');
const config = require('../config'); // Load configuration

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure, // true for 465, false for other ports
    auth: {
        user: config.mail.auth.user,
        pass: config.mail.auth.pass,
    },
});

/**
 * Sends an email.
 * @param {string} to Recipient email address.
 * @param {string} subject Email subject.
 * @param {string} text Plain text body.
 * @param {string} [html] HTML body (optional).
 * @returns {Promise<object>} Nodemailer message info object.
 */
const sendEmail = async (to, subject, text, html = null) => {
    const mailOptions = {
        from: config.mail.from, // Sender address
        to: to, // List of receivers
        subject: subject, // Subject line
        text: text, // Plain text body
        html: html, // HTML body (optional)
    };

    try {
        console.log(`Attempting to send email to ${to} with subject "${subject}"`);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully: %s', info.messageId);
        // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only available with ethereal.email
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email.'); // Re-throw or handle as needed
    }
};

// Verify connection configuration on startup (optional but recommended)
transporter.verify(function (error, success) {
    if (error) {
        console.error('Error verifying email transporter configuration:', error);
    } else {
        console.log('Email server is ready to take our messages');
    }
});

module.exports = {
    sendEmail,
}; 