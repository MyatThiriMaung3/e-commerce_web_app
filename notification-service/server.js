const express = require('express');
const config = require('./config'); // Load configuration (port, email settings)
const notificationRoutes = require('./routes/notificationRoutes');

// Initialize Express app
const app = express();

// --- Middleware ---

// Body parser middleware to handle JSON payloads
app.use(express.json());

// Add other middleware here if needed (e.g., logging, security headers)

// --- Routes ---

// Mount the notification routes under the /api/notifications prefix
app.use('/api/notifications', notificationRoutes);

// --- Basic Error Handling (can be expanded) ---

// Catch-all for 404 Not Found errors
app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
});

// Basic error handler (consider a more robust one like in order-service)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack || err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        // Optionally include stack trace in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});

// --- Start Server ---

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
    // The email service verification log should appear shortly after this
});

// Handle unhandled promise rejections (good practice)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

// Handle graceful shutdown (optional)
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    // Perform cleanup if needed
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
}); 