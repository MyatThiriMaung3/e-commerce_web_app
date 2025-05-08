const express = require('express');
const path = require('path');

const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Routes
app.use('/', customerRoutes);
app.use('/admin', adminRoutes);

// Start server
app.listen(3000, () => {
    console.log('Gateway service is running on port 3000');
});