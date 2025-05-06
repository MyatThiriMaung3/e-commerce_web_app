// server.js
const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config(); // Load .env

const productRoutes = require('./routes/productRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const commentRoutes = require('./routes/commentRoutes');

const app = express();

connectDB();

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/comments', commentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));