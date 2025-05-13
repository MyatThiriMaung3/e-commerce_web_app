console.log('ORDER SERVICE SERVER.JS MINIMAL TEST - SCRIPT START');

require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // HTTP request logger
const connectDB = require('./src/config/db');
const amqpService = require('./src/services/amqpService');
const logger = require('./src/config/logger'); // RESTORED
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// Import Routes
// const cartRoutes = require('./src/routes/cartRoutes'); // TEMP
// const orderRoutes = require('./src/routes/orderRoutes'); // TEMP
// const adminDiscountRoutes = require('./src/routes/admin/adminDiscountRoutes'); // TEMP
// const adminOrderRoutes = require('./src/routes/admin/adminOrderRoutes'); // TEMP
// const adminLoyaltyRoutes = require('./src/routes/admin/adminLoyaltyRoutes'); // TEMP
// const discountRoutes = require('./src/routes/discountRoutes'); // TEMP

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Connect to RabbitMQ (can be called here or lazily on first publish)
// Calling it here ensures the connection is ready early.
amqpService.connectRabbitMQ().catch(err => {
    logger.error('Initial AMQP connection failed. Service might not publish notifications.', err); // RESTORED
    // Depending on requirements, might want to exit process or retry aggressively.
});

// --- Middleware ---

// Enable CORS - Configure origins as needed for production
app.use(cors());

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging (Using Morgan)
// Use 'dev' format for development, consider 'combined' or custom for production
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
// Integrate with Winston logger (optional, morgan can log to files directly too)
// app.use(morgan('combined', { stream: logger.stream }));


// --- API Routes ---

// Add a root path handler for a simple status message
app.get('/', (req, res) => {
    res.status(200).send('Order Service Running');
});

app.get('/api/orders/health', (req, res) => res.status(200).send('Order Service is healthy'));

// Temporarily commented out for debugging startup
app.use('/api/cart', require('./src/routes/cartRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/discounts', require('./src/routes/discountRoutes'));
app.use('/api/admin/discounts', require('./src/routes/admin/adminDiscountRoutes'));
app.use('/api/admin/orders', require('./src/routes/admin/adminOrderRoutes'));
app.use('/api/admin/loyalty', require('./src/routes/admin/adminLoyaltyRoutes'));


// --- Error Handling Middleware ---

// 404 Not Found Handler (if no route matched above)
app.use(notFound);

// Global Error Handler (must be last middleware)
app.use(errorHandler);


// --- Start Server ---
const PORT = process.env.ORDER_SERVICE_PORT || 5003;

const server = app.listen(PORT, () => {
    logger.info(`Order Service running in ${process.env.NODE_ENV} mode on port ${PORT}`); // RESTORED
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Unhandled Rejection: ${err.message}`, { metadata: { error: err } }); // RESTORED
    // Close server & exit process gracefully
    server.close(() => process.exit(1));
});

// Handle SIGTERM signal for graceful shutdown (e.g., from Docker)
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received. Closing http server and AMQP connection.'); // RESTORED
    await amqpService.closeRabbitMQ();
    server.close(() => {
        logger.info('Http server closed.'); // RESTORED
        process.exit(0);
    });
});

module.exports = app; // Export for testing purposes if needed 

console.log('ORDER SERVICE SERVER.JS MINIMAL TEST - SCRIPT END'); 