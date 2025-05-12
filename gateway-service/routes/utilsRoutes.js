const express = require('express');
const router = express.Router();
const axios = require('axios');

const jwt = require('jsonwebtoken');
const utilsController = require('../controllers/utilsController');

router.get('/login', utilsController.renderLogin);
// router.get('/logout', utilsController.renderLogout);
router.get('/register', utilsController.renderRegister);
router.get('/error', utilsController.renderError);

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const response = await axios.post('http://localhost:3001/api/users/login', { email, password });
        if (response.status === 200) {
            // req.session.message = {
            //     type: 'success',
            //     title: 'Successfully Logged In!',
            //     text: 'You have logged in successfully!',
            // };
            
            // Set cookie with JWT token
            res.cookie('token', response.data.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Redirect based on role
            const decoded = jwt.decode(response.data.token);
            if (decoded.role === 'admin') {
                return res.redirect('/admin');
            } else {
                return res.redirect('/products');
            }

        } else {
            res.render('login', { error: response.status + ': ' + response.message });
        }
    } catch (err) {
        console.error(err);
        res.render(
            'error', 
            { status: err.status, 
                errorTitle: "Error Occured", 
                message: err.response?.data?.error 
            }
        );
    }
});

router.post('/register', async (req, res) => {
    const { fullName, email, address } = req.body;

    const addresses = [
        {
            address: address
        }
    ];

    try {
        const response = await axios.post('http://localhost:3001/api/users/register', { fullName, email, addresses });
        if (response.status === 201) {
            req.session.message = {
                type: 'success',
                title: 'Registered!',
                text: 'The default password is 123456. Please login to continue.',
            };
            res.redirect('/login');
        } else {
            res.render('register', { error: response.status + ': ' + response.message });
        }
    } catch (err) {
        console.error(err);
        res.render(
            'error', 
            { status: err.status, 
                errorTitle: "Error Occured", 
                message: err.response?.data?.error 
            }
        );
    }
});

// router.get('/logout', (req, res) => {
//   // Clear the token cookie
//   res.clearCookie('token');

//   req.session.message = {
//     type: 'info',
//     title: 'Logged Out',
//     text: 'You have been successfully logged out.'
//   };

//   res.redirect('/login');
// });

router.get('/logout', (req, res) => {
    res.clearCookie('token'); // remove the JWT token
    res.render('login', { error: "You have logged out successfully" });
});

module.exports = router;