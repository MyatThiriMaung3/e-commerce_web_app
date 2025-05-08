const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const variantController = require('../controllers/variantController');

router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

router.post('/:productId/variants', variantController.addVariant);
router.put('/:productId/variants/:variantId', variantController.updateVariant);
router.delete('/:productId/variants/:variantId', variantController.deleteVariant);

module.exports = router;