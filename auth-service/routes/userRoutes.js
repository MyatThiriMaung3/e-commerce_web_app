const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// users
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/', userController.getAllUsers);
router.get('/logged-in', userController.getLoggedInUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/password', userController.getUserPassword);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.get('/total/all-user', userController.getAllUserCount);
router.get('/total/new-user', userController.getUserCountByDate);


// Addresses
router.get('/:userId/addresses', userController.getAddresses);
router.post('/:userId/addresses', userController.addAddress);
router.put('/:userId/addresses/:addressId', userController.updateAddress);
router.delete('/:userId/addresses/:addressId', userController.deleteAddress);

// Cart
router.get('/:userId/cart', userController.getCart);
router.post('/:userId/cart', userController.addToCart);
router.put('/:userId/cart/:itemId', userController.updateCartItem);
router.delete('/:userId/cart/:itemId', userController.deleteCartItem);
router.delete('/:userId/cart', userController.clearCart);

module.exports = router;