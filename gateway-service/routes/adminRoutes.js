const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const adminController = require('../controllers/adminController');
const upload = require('../middlewares/upload');

// router.get('/products', adminController.renderAdminProducts);

router.get('/products', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/products');
    const products = response.data;

    res.render('admin/products', { products, error: null, title: "Le administrateur - Products" });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).send('Failed to fetch products');
  }
});

router.get('/users', adminController.renderAdminUsers);
router.get('/discounts', adminController.renderAdminDiscounts);
router.get('/orders', adminController.renderAdminOrders);

router.get('/product-details/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const response = await axios.get(`http://localhost:3002/api/products/${productId}`);
    const product = response.data;

    res.render('admin/product-details', { product, error: null, title: "Le administrateur - Product Details" });
  } catch (err) {
    console.error('Error fetching product details:', err.message);
    res.status(500).send('Failed to fetch product details');
  }
});

router.get('/product-create', async (req, res) => {
  res.render('admin/product-create', { error: null, title: "Le administrateur - Create Product" });
});

router.post('/product-create',
  upload.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'variantImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        productName,
        description,
        brand,
        category,
        variantName,
        variantDescription,
        variantPrice,
        variantStock
      } = req.body;

      const variantImages = req.files['variantImages'] || [];

      const variant = {
        variantName: variantName,
        extraDescription: variantDescription,
        price: parseFloat(variantPrice),
        stock: parseInt(variantStock),
        images: variantImages.map(image => image.filename) // Assuming variantImages is an array of filenames
      }

      const productImagePath = req.files['productImage'][0].filename;

      const product = {
        name: productName,
        description,
        brand,
        tag: category,
        price: parseFloat(variantPrice),
        totalStock: parseInt(variantStock),
        image: productImagePath,
        variants: [variant]
      };

      // Post to API
      const response = await axios.post('http://localhost:3002/api/products/', product, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
      res.redirect('/admin/products');

    } catch (err) {
      console.error(err);
      res.render('admin/product-create', {
        error: 'Failed to create product',
        title: 'Le administrateur - Create Product'
      });
    }
  }
);

router.post('/product-update/:id',
  upload.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'variantImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const { name, description, brand, category } = req.body;

      let product;

      if (!req.files['productImage']) {
        product = {
          name: name,
          description,
          brand,
          tag: category
        };
      } else {
        const productImagePath = req.files['productImage'][0].filename;

        product = {
          name: name,
          description,
          brand,
          tag: category,
          image: productImagePath
        };
      }
      
      // Post to API
      const response = await axios.put(`http://localhost:3002/api/products/${productId}`, product, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      res.redirect('/admin/product-details/' + productId);
    } catch (err) {
      console.error(err);
      res.render('admin/product-create', {
        error: 'Failed to create product',
        title: 'Le administrateur - Create Product'
      });
    }
  }
);

router.post('/variant-create/:productId',
  upload.fields([
    { name: 'variantImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const { variantName, extraDescription, variantPrice, variantStock } = req.body;

      const variantImages = req.files['variantImages'] || [];

      const variant = {
        variantName,
        extraDescription,
        price: parseFloat(variantPrice),
        stock: parseInt(variantStock),
        images: variantImages.map(image => image.filename)
      };

      // Post to API
      const response = await axios.post(`http://localhost:3002/api/products/${productId}/variants`, variant, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      res.redirect(`/admin/product-details/${productId}`);

    } catch (err) {
      console.error(err);
      res.render('admin/product-create', {
        error: 'Failed to create product',
        title: 'Le administrateur - Create Product'
      });
    }
  }
);

router.post('/variant-update/:productId/:variantId',
  upload.fields([
    { name: 'variantImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const variantId = req.params.variantId;

      const variantName = req.body[`variantName${variantId}`];
      const extraDescription = req.body[`extraDescription${variantId}`];
      const price = req.body[`variantPrice${variantId}`];
      const stock = req.body[`variantStock${variantId}`];

      let variant;

      if (!req.files['variantImages' + variantId]) {
        variant = {
          variantName,
          extraDescription,
          price: parseFloat(price),
          stock: parseInt(stock),
        };
      } else {

        const variantImages = req.files[`variantImages${variantId}`] || [];

        variant = {
          variantName,
          extraDescription,
          price: parseFloat(price),
          stock: parseInt(stock),
          images: variantImages.map(image => image.filename)
        };
      }

      // Post to API
      const response = await axios.put(`http://localhost:3002/api/products/${productId}/variants/${variantId}`, variant, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      res.redirect(`/admin/product-details/${productId}`);

    } catch (err) {
      console.error(err);
      res.render('admin/product-create', {
        error: 'Failed to create product',
        title: 'Le administrateur - Create Product'
      });
    }
  }
);

router.post('/variant-delete/:productId/:variantId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const variantId = req.params.variantId;

    // Post to API
    const response = await axios.delete(`http://localhost:3002/api/products/${productId}/variants/${variantId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    res.redirect(`/admin/product-details/${productId}`);

  } catch (err) {
    console.error(err);
    res.render('admin/product-create', {
      error: 'Failed to create product',
      title: 'Le administrateur - Create Product'
    });
  }
});

router.get('/order-specific-details', adminController.renderAdminOrderSpecificDetails);

module.exports = router;