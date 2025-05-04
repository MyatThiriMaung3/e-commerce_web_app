const express = require('express');
const path = require('path');
const { title } = require('process');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get(['/', '/landing'], (req, res) => {
    res.render('landing', {error: null, title: "L'Ordinateur Très Bien - Landing Page"});
});

app.get('/login', (req, res) => {
    res.render('login', {error: null});
});

app.get('/logout', (req, res) => {
    res.render('login', {error: "logout is pressed"})
});

app.get('/register', (req, res) => {
    res.render('register', {error: null})
});

app.get('/details', (req, res) => {
    res.render('product-details', {error: null, title: "L'Ordinateur Très Bien - Product Details"});
});

app.get('/products', (req, res) => {
    res.render('products', {error: null, title: "L'Ordinateur Très Bien - Products"});
});

app.get('/account', (req, res) => {
    res.render('account', {error: null, title: "L'Ordinateur Très Bien - Account"});
});

app.get('/cart', (req, res) => {
    res.render('cart', {error: null, title: "L'Ordinateur Très Bien - Cart"});
});

app.get('/order-details', (req, res) => {
    res.render('order-details', {error: null, title: "L'Ordinateur Très Bien - Order Details"});
});

app.get('/order-summary', (req, res) => {
    res.render('order-summary', {error: null, title: "L'Ordinateur Très Bien - Order Summary"});
});

app.get('/order-list', (req, res) => {
    res.render('order-list', {error: null, title: "L'Ordinateur Très Bien - Order list"});
});

app.get('/order-specific-details', (req, res) => {
    res.render('order-specific-details', {error: null, title: "L'Ordinateur Très Bien - Order Specific Details"});
});

app.get('/success', (req, res) => {
    res.render('success', {error: null, title: "L'Ordinateur Très Bien - Success"});
});

app.get('/error', (req, res) => {
    res.render('error', {status: 404, errorTitle: "404 Error Occured", message: "Page not found"})
});

app.listen(3000);
console.log('Gateway service is running on port 3000');