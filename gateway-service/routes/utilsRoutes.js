const express = require('express');
const router = express.Router();
const axios = require('axios');
const utilsController = require('../controllers/utilsController');

router.get('/login', utilsController.renderLogin);
router.get('/logout', utilsController.renderLogout);
router.get('/register', utilsController.renderRegister);
router.get('/error', utilsController.renderError);

module.exports = router;