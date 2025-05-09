const express = require('express');
const router = express.Router();
const axios = require('axios');
const customerController = require('../controllers/customerController');

router.get(['/', '/landing'], customerController.renderLanding);
router.get('/login', customerController.renderLogin);
router.get('/logout', customerController.renderLogout);
router.get('/register', customerController.renderRegister);
router.get('/details', customerController.renderDetails);

// router.get('/products', customerController.renderProducts);

router.get('/products', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/products');
    const products = response.data;

    res.render('customer/products', { products, error: null, title: "L'Ordinateur Très Bien - Products" });
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



router.get('/account', customerController.renderAccount);
router.get('/cart', customerController.renderCart);
router.get('/order-details', customerController.renderOrderDetails);
router.get('/order-summary', customerController.renderOrderSummary);
router.get('/order-list', customerController.renderOrderList);
router.get('/order-specific-details', customerController.renderOrderSpecificDetails);
router.get('/success', customerController.renderSuccess);
router.get('/error', customerController.renderError);

module.exports = router;