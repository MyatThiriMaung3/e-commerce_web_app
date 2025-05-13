const express = require('express');
const bodyParser = require('body-parser');
const orderRoutes = require('./routes/orderRoutes');
const discountRoutes = require('./routes/discountRoutes');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());

app.use('/api/orders', orderRoutes);
app.use('/api/discounts', discountRoutes);

const PORT = process.env.PORT || 3003;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server due to DB connection error:", err.message);
});