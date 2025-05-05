console.log('Order Service: Starting server.js');
require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler'); // Import error handler
const logger = require('./src/config/logger'); // Import logger
const morgan = require('morgan'); // Import morgan

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));

// Morgan HTTP request logger middleware (using Winston stream)
// Use 'dev' format for concise console output
app.use(morgan('dev', { stream: logger.stream }));

app.get('/', (req, res) => {
    console.log('Order Service: Handling GET /');
    res.send('Order Service Running');
});

// Define Routes
app.use('/api/orders', require('./src/routes/orders'));
// app.use('/api/cart', require('./src/routes/cart')); // Note: Cart might be managed by Auth service
app.use('/api/discounts', require('./src/routes/discounts'));

// Admin Routes
app.use('/api/admin/orders', require('./src/routes/admin/orders'));
app.use('/api/admin/discounts', require('./src/routes/admin/discounts'));
// Add other admin routes later (e.g., admin discounts)

// Centralized Error Handler - Must be LAST middleware registered
app.use(errorHandler);

// Basic health check
app.get('/health', (req, res) => {
    console.log('Order Service: Handling GET /health');
    res.status(200).json({ status: 'OK', service: 'order-service' });
});

const PORT = process.env.ORDER_SERVICE_PORT || 5003;

// Start listening only if the script is run directly (not required by tests)
if (require.main === module) {
    console.log(`Order Service: Attempting to listen on port ${PORT}`);
    app.listen(PORT, () => {
        console.log(`Order Service: Successfully listening on port ${PORT}`);
        logger.info(`Order Service running on port ${PORT}`);
    });
}

// Handle Unhandled Rejections and Exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Consider graceful shutdown
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', { error });
  // Mandatory graceful shutdown
  process.exit(1);
});

module.exports = app; // Export app for testing 