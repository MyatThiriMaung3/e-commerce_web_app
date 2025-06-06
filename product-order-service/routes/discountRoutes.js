const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.post('/', discountController.createDiscount);
router.get('/', discountController.getDiscounts);
router.get('/check-discount/:code', discountController.checkDiscount);
router.put('/usage/increment', discountController.incrementDiscountUsage);
router.get('/:id', discountController.getDiscountById);
router.put('/:id', discountController.updateDiscount);
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;