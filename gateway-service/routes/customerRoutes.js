const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get(['/', '/landing'], customerController.renderLanding);
router.get('/login', customerController.renderLogin);
router.get('/logout', customerController.renderLogout);
router.get('/register', customerController.renderRegister);
router.get('/details', customerController.renderDetails);
router.get('/products', customerController.renderProducts);
router.get('/account', customerController.renderAccount);
router.get('/cart', customerController.renderCart);
router.get('/order-details', customerController.renderOrderDetails);
router.get('/order-summary', customerController.renderOrderSummary);
router.get('/order-list', customerController.renderOrderList);
router.get('/order-specific-details', customerController.renderOrderSpecificDetails);
router.get('/success', customerController.renderSuccess);
router.get('/error', customerController.renderError);

module.exports = router;