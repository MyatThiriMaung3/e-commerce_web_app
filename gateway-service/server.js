const express = require('express');
const path = require('path');
const session = require('express-session');

const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const flashMessage = require('./middlewares/flashMessage');

require('dotenv').config();

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: true
}));

app.use(flashMessage);

// Routes
app.use('/', customerRoutes);
app.use('/admin', adminRoutes);

// Start server
app.listen(3000, () => {
    console.log('Gateway service is running on port 3000');
});