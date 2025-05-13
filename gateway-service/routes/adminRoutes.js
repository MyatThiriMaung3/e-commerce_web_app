const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const adminController = require('../controllers/adminController');
const upload = require('../middlewares/upload');

const { authenticateUser, requireRole } = require('../middlewares/auth');

// router.get('/', authenticateUser, requireRole('admin'), adminController.renderAdminDashboard);

router.get('/', adminController.renderAdminDashboard);



// router.get('/products', adminController.renderAdminProducts);

router.get('/products', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/products');
    const products = response.data;

    res.render('admin/products', { products, error: null, title: "Le administrateur - Products" });
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

// router.get('/users', adminController.renderAdminUsers);

router.get('/users', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/api/users');
    const users = response.data;

    res.render('admin/users', { users, error: null, title: "Le administrateur - Users" });
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
}
);

router.get('/user-details/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const response = await axios.get(`http://localhost:3001/api/users/${userId}`);
    const user = response.data;

    res.render('admin/user-details', { user, error: null, title: "Le administrateur - User Details" });
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

router.post('/user-status-update/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    let updateStatus = "normal";
    if (status === "normal") {
      updateStatus = "banned";
    } else if (status === "banned") {
      updateStatus = "normal";
    }

    const user = {
      status: updateStatus
    };

    const response = await axios.put(`http://localhost:3001/api/users/${userId}`, user, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

    req.session.message = {
      type: 'success',
      title: 'Updated!',
      text: 'User status updated successfully.'
    };

    res.redirect('/admin/users');
  }
  catch (err) {
    console.error(err);
    res.render(
      'error', 
      { status: err.status, 
        errorTitle: "Error Occured", 
        message: err.response?.data?.error 
      }
    );
  }
}
);


router.get('/discounts', adminController.renderAdminDiscounts);
router.get('/orders', adminController.renderAdminOrders);

router.get('/product-details/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const response = await axios.get(`http://localhost:3002/api/products/${productId}`);
    const product = response.data;

    res.render('admin/product-details', { product, error: null, title: "Le administrateur - Product Details" });
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

      req.session.message = {
        type: 'success',
        title: 'Created!',
        text: 'Product created successfully.'
      };
  
      res.redirect('/admin/products');

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
  }
);

router.post('/product-update/:id', 
  upload.fields([
    { name: 'productImage', maxCount: 10 }
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
          lastUpdatedAt: new Date(),
          tag: category,
        };
      } else {
        const productImagePath = req.files['productImage'][0].filename;

        product = {
          name: name,
          description,
          brand,
          tag: category,
          updatedAt: new Date(),
          image: productImagePath,
        };
      }
      
      // Post to API
      const response = await axios.put(`http://localhost:3002/api/products/${productId}`, product, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      req.session.message = {
        type: 'success',
        title: 'Updated!',
        text: 'Product updated successfully.'
      };

      res.redirect('/admin/product-details/' + productId);
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
  }
);

router.post('/product-delete/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    // Post to API
    const response = await axios.delete(`http://localhost:3002/api/products/${productId}`);
    // res.json({
    //   success: true,
    //   message: 'Product deleted successfully',
    //   updatedProduct: response.data
    // });

    req.session.message = {
      type: 'success',
      title: 'Deleted!',
      text: 'Product deleted successfully.'
    };

    res.redirect('/admin/products');
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

      req.session.message = {
        type: 'success',
        title: 'Created!',
        text: 'Variant created successfully.'
      };

      res.redirect(`/admin/product-details/${productId}`);

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
  }
);

router.post('/variant-update/:productId/:variantId',
  upload.any(),
  async (req, res) => {
    try {
      const productId = req.params.productId;
      const variantId = req.params.variantId;

      const variantName = req.body[`variantName${variantId}`];
      const extraDescription = req.body[`extraDescription${variantId}`];
      const price = req.body[`variantPrice${variantId}`];
      const stock = req.body[`variantStock${variantId}`];

      let variant;

      if (!req.files || req.files.length === 0) {
        variant = {
          variantName,
          extraDescription,
          price: parseFloat(price),
          stock: parseInt(stock),
        };
      } else {

        const variantImages = req.files;

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

      req.session.message = {
        type: 'success',
        title: 'Updated!',
        text: 'Variant updated successfully.'
      };

      res.redirect(`/admin/product-details/${productId}`);

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
  }
);

router.post('/variant-delete/:productId/:variantId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const variantId = req.params.variantId;

    // Post to API
    const response = await axios.delete(`http://localhost:3002/api/products/${productId}/variants/${variantId}`);

    console.log('Variant deleted:', response.data);
    // res.json({
    //   success: true,
    //   message: 'Variant deleted successfully',
    //   updatedProduct: response.data
    // });    

    req.session.message = {
        type: 'success',
        title: 'Deleted!',
        text: 'Variant deleted successfully.'
    };
    
    res.redirect(`/admin/product-details/${productId}`);

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

router.get('/order-specific-details', adminController.renderAdminOrderSpecificDetails);

module.exports = router;