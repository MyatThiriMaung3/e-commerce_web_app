console.log('Notification Service: Starting server.js');
require('dotenv').config(); // Load .env variables first
const express = require('express');
const config = require('./config');
// REMOVED: Route import as it's no longer used for order confirmation
// const notificationRoutes = require('./routes/notificationRoutes');
const logger = require('./config/logger'); // Import logger
const addRequestId = require('express-request-id')();
const amqpService = require('./services/amqpService'); // Import AMQP service
const morgan = require('morgan'); // Import morgan

// Initialize Express app
const app = express();

// --- Middleware ---
app.use(addRequestId); // Keep for potential future HTTP routes
app.use(express.json()); // Keep for potential future HTTP routes

// Morgan HTTP request logger middleware (using Winston stream)
morgan.token('id', function getId (req) { return req?.id || '-'; }); // Handle potentially undefined req.id
// Customize format if needed, e.g., ':id :remote-addr ...'
app.use(morgan('dev', { // Using 'dev' format for concise console output
    stream: logger.stream,
    // Optional: skip health checks
    // skip: (req, res) => req.originalUrl === '/health'
}));

// --- Routes ---
// Mount notification routes only if there are other HTTP endpoints defined in notificationRoutes.js
// If not, this line can be removed entirely.
// app.use('/api/notifications', notificationRoutes);

// Add a basic health check endpoint
app.get('/health', (req, res) => {
    console.log('Notification Service: Handling GET /health');
    // Log health check access if needed (might be too noisy)
    // logger.info('Health check accessed', { metadata: { requestId: req?.id } });
    res.status(200).json({ status: 'OK', service: 'notification-service', timestamp: new Date() });
});

// --- Error Handling ---
// Catch 404s for any routes not handled
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// Enhanced Centralized Error Handler
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    let message = err.message || 'Internal Server Error';
    const requestId = req?.id; // Safely access request ID

    // Log the error using Winston
    logger.error(`${statusCode} - ${message}`, {
        metadata: {
            requestId: requestId || '-',
            name: err.name,
            status: statusCode,
            requestUrl: req?.originalUrl,
            requestMethod: req?.method,
            stack: err.stack // Log stack trace for debugging
        }
    });

    // Simplify message for generic 500 errors in production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An internal server error occurred.';
    }

    // Send JSON response
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        requestId: requestId, // Include request ID in response if available
        message: message,
        // Only include stack in development environment for security
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});

// --- Start Server & AMQP Consumer ---
const PORT = config.port;

async function startService() {
    try {
        await amqpService.startConsumer(); // Start consumer
        // logger.info('AMQP consumer started successfully.'); // This is logged within amqpService now

        // Start HTTP server for health checks (and potentially future routes)
        console.log(`Notification Service: Attempting to listen on port ${PORT}`);
        app.listen(PORT, () => {
            console.log(`Notification Service: Successfully listening on port ${PORT}`);
            logger.info(`Notification Service HTTP listener running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start Notification Service:', { metadata: { error: error } });
        process.exit(1);
    }
}

startService();

// --- Process Event Handlers ---
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { metadata: { reason, promise } });
    // Consider graceful shutdown here as well depending on the reason
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { metadata: { error: error } });
    // Mandatory graceful shutdown
    amqpService.closeConnection().finally(() => process.exit(1));
});

process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received. Closing Notification Service gracefully...');
    try {
        await amqpService.closeConnection();
        // logger.info('AMQP connection closed.'); // Logged within closeConnection
        logger.info('Exiting Notification Service gracefully.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown:', { metadata: { error: error } });
        process.exit(1);
    }
}); 