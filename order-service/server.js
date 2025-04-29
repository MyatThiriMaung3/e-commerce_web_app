require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send('Order Service Running'));

// Define Routes (We'll add these later)
// app.use('/api/orders', require('./src/routes/orders'));
// app.use('/api/cart', require('./src/routes/cart'));
// app.use('/api/discounts', require('./src/routes/discounts'));

const PORT = process.env.ORDER_SERVICE_PORT || 5003;

app.listen(PORT, () => console.log(`Order Service started on port ${PORT}`)); 