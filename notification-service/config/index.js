require('dotenv').config(); // Load variables from .env file

const config = {
    port: process.env.PORT || 3004,
    mail: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT, 10) || 587,
        secure: process.env.MAIL_SECURE === 'true', // Convert string 'true' to boolean
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        from: process.env.MAIL_FROM,
    },
};

// Basic validation (can be expanded)
if (!config.mail.host || !config.mail.auth.user || !config.mail.auth.pass) {
    console.error('FATAL ERROR: Email configuration (host, user, pass) is missing in .env file.');
    // In a real app, might exit or throw a more specific error
    // process.exit(1);
}

module.exports = config; 