const express = require('express');
const router = express.Router();
const axios = require('axios');
const customerController = require('../controllers/customerController');

// router.get(['/', '/landing'], customerController.renderLanding);

router.get(['/', 'landing'], async (req, res) => {
  try {

    let sort_by = 'updated';
    let order = 'desc';
    let limit = 5;

    const responseNewProduct = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order + '&limit=' + limit);
    const newProducts = responseNewProduct.data.products;

    const responseBestSeller = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=sales&order=' + order + '&limit=' + limit);
    const bestSellerProducts = responseBestSeller.data.products;

    const responseCpu = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order + '&limit=' + limit + '&category=cpu');
    const cpuProducts = responseCpu.data.products;

    const responseGpu = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order + '&limit=' + limit + '&category=gpu');
    const gpuProducts = responseGpu.data.products;

    const responseHdd = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order + '&limit=' + limit + '&category=hdd');
    const hddProducts = responseHdd.data.products;

    const responseSsd = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order + '&limit=' + limit + '&category=ssd');
    const ssdProducts = responseSsd.data.products;


    res.render('customer/landing', { newProducts, bestSellerProducts, cpuProducts, gpuProducts, hddProducts, ssdProducts, error: null, title: "L'Ordinateur Très Bien - Home" });
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



// router.get('/details', customerController.renderDetails);

router.get('/details/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const responseProduct = await axios.get(`http://localhost:3002/api/products/${productId}`);
    const responseRatings = await axios.get(`http://localhost:3002/api/ratings/${productId}`);
    const responseComments = await axios.get(`http://localhost:3002/api/comments/${productId}`);
    
    const product = responseProduct.data;
    const ratings = responseRatings.data;
    const comments = responseComments.data;


    res.render('customer/product-details', { product, ratings, comments, error: null, title: "Le administrateur - Product Details" });
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

// router.get('/products', customerController.renderProducts);

// router.get('/products', async (req, res) => {
//   try {
//     const tags = ['cpu', 'motherboard', 'gpu', 'ram', 'hdd', 'ssd', 'nvme', 'psu', 'case', 'cooling-air', 'cooling-liquid', 'optical', 'fans', 'expansion', 'cables', 'thermal', 'bios', 'mounting']

//     const { sort } = req.query;
//     console.log('Sort:', sort);

//     var sort_selected = sort || 'price_high_to_low';
//     let sort_by = '';
//     let order = '';


//   switch(sort) {
//     case 'price_low_to_high':
//       sort_by = 'price';
//       order = 'asc';
//       break;
//     case 'price_high_to_low':
//       sort_by = 'price';
//       order = 'desc';
//       break;
//     case 'name_a_to_z':
//       sort_by = 'name';
//       order = 'asc';
//       break;
//     case 'name_z_to_a':
//       sort_by = 'name';
//       order = 'desc';
//       break;
//     case 'newest_first':
//       sort_by = 'updated';
//       order = 'desc';
//       break;
//     case 'oldest_first':
//       sort_by = 'updated';
//       order = 'asc';
//       break;
//     case 'rating_low_to_high':
//       sort_by = 'rating';
//       order = 'asc';
//       break;
//     case 'rating_high_to_low':
//       sort_by = 'rating';
//       order = 'desc';
//       break;
//     default:
//       sort_by = 'price';
//       order = 'desc';
//       break;
//   }


//     const response = await axios.get('http://localhost:3002/api/products?sort_by=' + sort_by + '&order=' + order);
//     // const products = response.data;
//     const { currentPage, totalPages, totalProducts, products } = response.data;


//     res.render('customer/products', { currentPage, totalPages, totalProducts, products, sort_selected, error: null, title: "L'Ordinateur Très Bien - Products" });
//   } catch (err) {
//     console.error(err);
//     res.render(
//       'error', 
//       { status: err.status, 
//         errorTitle: "Error Occured", 
//         message: err.response?.data?.error 
//       }
//     );
//   }
// });

router.get('/products', async (req, res) => {
  try {

    let selectedSort = req.query.sort || 'price_high_to_low';
    let sort_by = req.query.sort_by || 'price';
    let order = req.query.order || 'desc';

    const response = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=' + sort_by + '&order=' + order);
    // const products = response.data;
    const { currentPage, totalPages, totalProducts, products } = response.data;


    res.render('customer/products', { selectedSort, currentPage, totalPages, totalProducts, products, error: null, title: "L'Ordinateur Très Bien - Products" });
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

// local api proxy to fetch products from product service and response to the client
// router.get('/api/products', async (req, res) => {
//   const { sort_by, order } = req.query;
//   try {
//     const response = await axios.get('http://localhost:3002/api/products/sort/filter', { params: { sort_by, order } });
//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
//   }
// });

router.get('/api/products', async (req, res) => {
  try {
    // Extract all expected parameters from the client
    const {
      search,
      minPrice,
      maxPrice,
      category,
      minRating,
      maxRating,
      sort_by,
      order,
      page,
      limit
    } = req.query;

    // Build params object, preserving array values for category and rating
    const params = {
      search,
      minPrice,
      maxPrice,
      minRating,
      maxRating,
      sort_by,
      order,
      page,
      limit
    };

    // Allow category and rating to be arrays (handle multiple values)
    if (category) {
      params.category = Array.isArray(req.query.category)
        ? req.query.category
        : [req.query.category];
    }

    // Make the request to the backend API with the full filter set
    const response = await axios.get('http://localhost:3002/api/products/sort/filter', { params });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});



router.get('/account', customerController.renderAccount);
router.get('/cart', customerController.renderCart);
router.get('/order-details', customerController.renderOrderDetails);
router.get('/order-summary', customerController.renderOrderSummary);
router.get('/order-list', customerController.renderOrderList);
router.get('/order-specific-details', customerController.renderOrderSpecificDetails);
router.get('/success', customerController.renderSuccess);

module.exports = router;