require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler'); // Import error handler

// Connect Database
// connectDB(); // <- REMOVE THIS LINE

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send('Order Service Running'));

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

const PORT = process.env.ORDER_SERVICE_PORT || 5003;

// Start listening only if the script is run directly (not required by tests)
if (require.main === module) {
    connectDB(); // <- ADD THIS LINE HERE
    app.listen(PORT, () => console.log(`Order Service started on port ${PORT}`));
}

module.exports = app; // Export app for testing 