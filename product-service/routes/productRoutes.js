const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const variantController = require('../controllers/variantController');

router.post('/', productController.createProduct);
router.get('/sort/filter', productController.getProductsSort);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.put('/sale/increment', productController.incrementProductSales);
router.put('/stock/decrement', productController.decreaseProductStock);
router.delete('/:id', productController.deleteProduct);

router.get('/sales/by-cat', productController.getTotalSalesByTag);

router.post('/:productId/variants', variantController.addVariant);
router.put('/:productId/variants/:variantId', variantController.updateVariant);
router.delete('/:productId/variants/:variantId', variantController.deleteVariant);

module.exports = router;