const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);


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

module.exports = router;