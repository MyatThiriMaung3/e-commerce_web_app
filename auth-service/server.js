const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get('/login', (req, res) => {
    res.render('login', {error: null})
});

app.get('/logout', (req, res) => {
    res.render('login', {error: "logout is pressed"})
});

app.get('/signup', (req, res) => {
    res.render('signup', {error: null})
});

app.get('/error', (req, res) => {
    res.render('error', {status: 404, title: "404 Error Occured", message: "Page not found"})
});

app.listen(3001);
console.log('Auth service is running on port 3001');