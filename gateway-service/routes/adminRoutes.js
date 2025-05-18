const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const qs = require('qs');
const FormData = require('form-data');
const adminController = require('../controllers/adminController');
const upload = require('../middlewares/upload');

const { authenticateUser, requireRole } = require('../middlewares/auth');

// router.get('/', authenticateUser, requireRole('admin'), adminController.renderAdminDashboard);

// router.get('/', adminController.renderAdminDashboard);

router.get('/', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    let dateFilter = req.query.dateFilter || 'this_year';

    let startDate;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // Include full end of day

    if (dateFilter === 'this_year') {
      startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);
    } else if (dateFilter === 'this_quarter') {
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3);
    } else if (dateFilter === 'this_month') {
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    } else if (dateFilter === 'this_week') {
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
    } else if (dateFilter === 'custom') {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.render(
          'error', 
          { status: 400, 
            errorTitle: "Error Occured", 
            message: "Custom dateFilter requires 'start' and 'end' query parameters." 
          }
        );
      } else {
        startDate = new Date(start);
        endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
      }
      
    } else {

      return res.render(
      'error', 
      { status: 400, 
        errorTitle: "Error Occured", 
        message: "Invalid dateFilter value." 
      }
    );
    }

    const responseTotalUsers = await axios.get('http://localhost:3001/api/users/total/all-user');
    const totalUsers = responseTotalUsers.data.totalUsers;

    const responseNewUsers = await axios.get('http://localhost:3001/api/users/total/new-user');
    const newUsers = responseNewUsers.data.newUsers;

    const responseTotalOrders = await axios.get('http://localhost:3003/api/orders/total/all-order');
    const totalOrders = responseTotalOrders.data.totalOrders;
    const totalRevenue = responseTotalOrders.data.totalRevenue;
    const totalProfit = totalRevenue * 0.1;

    
    const responseOrders = await axios.get(`http://localhost:3003/api/orders/total/new-order?startDate=${startDate}&endDate=${endDate}`);
    const orders = responseOrders.data.totalOrders;
    const revenue = responseOrders.data.totalRevenue;
    const profit = revenue * 0.1;

    const responseBestSelling = await axios.get(`http://localhost:3003/api/orders/sales/best-selling?startDate=${startDate}&endDate=${endDate}`);
    let bestSellingLabels = [];
    let bestSellingsData = [];

    const products = responseBestSelling.data.data;

    products.forEach(product => {
      bestSellingLabels.push(product.productName);
      bestSellingsData.push(product.sales);
    });

    const responseProductSoldByCat = await axios.get('http://localhost:3002/api/products/sales/by-cat');
    let productSoldByCatLabels = [];
    let productSoldByCatData = [];

    responseProductSoldByCat.data.forEach(item => {
      productSoldByCatLabels.push(item.tag);
      productSoldByCatData.push(item.totalSales);
    });

    const responseRevenueProfit = await axios.get(`http://localhost:3003/api/orders/stats/weekly-order?startDate=${startDate}&endDate=${endDate}`);
    let revenueProfitLabels = [];
    let revenueProfitDataRevenue = [];
    let revenueProfitDataProfit = [];
    let ordersChartLabels = [];
    let ordersChartData = [];

    responseRevenueProfit.data.data.forEach(item => {
      revenueProfitLabels.push(item.week);
      revenueProfitDataRevenue.push(item.revenue);
      revenueProfitDataProfit.push(item.revenue * 0.1);

      ordersChartLabels.push(item.week);
      ordersChartData.push(item.orderCount);
    });

    res.render('admin/dashboard', { bestSellingLabels, bestSellingsData, productSoldByCatLabels, productSoldByCatData, revenueProfitLabels, revenueProfitDataRevenue, revenueProfitDataProfit, ordersChartLabels, ordersChartData, totalUsers, newUsers, totalOrders, totalRevenue, totalProfit, orders, revenue, profit, dateFilter, error: null, title: "Le administrateur - Products" });
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



// router.get('/products', adminController.renderAdminProducts);

router.get('/products', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    let pageNumber = 1;

    if (req.query.page) pageNumber = req.query.page;

    const response = await axios.get('http://localhost:3002/api/products/sort/filter?sort_by=sales&order=desc&page=' + pageNumber);

    const { currentPage, totalPages, totalProducts, products } = response.data;

    res.render('admin/products', { currentPage, totalPages, totalProducts, products, error: null, title: "Le administrateur - Products" });
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

router.get('/users', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3001/api/users/logged-in');
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

router.get('/user-details/:id', authenticateUser, requireRole('admin'), async (req, res) => {
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

router.post('/user-status-update/:id', authenticateUser, requireRole('admin'), async (req, res) => {
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


// router.get('/discounts', adminController.renderAdminDiscounts);

router.get('/discounts', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
      const response = await axios.get(`http://localhost:3003/api/discounts`);
      const discounts = response.data;
  
      res.render('admin/discounts', { discounts, error: null, title: "Le administrateur - Discount List" });
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

router.post('/discount-create', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
      const { discountCode, discountValue, maxUsage } = req.body;

      // Validate discount code: must be exactly 5-character alphanumeric
      const isValidCode = /^[a-zA-Z0-9]{5}$/.test(discountCode);

      // Validate maxUsage: must be an integer between 0 and 10 (inclusive)
      const isValidMaxUsage = Number.isInteger(Number(maxUsage)) && maxUsage >= 1 && maxUsage <= 10;

      // if (!isValidCode) {
      //   req.session.message = {
      //     type: 'error',
      //     title: 'Invalid Discount Code!',
      //     text: 'Discount code must be a 5-character alphanumeric string.'
      //   };
    
      //   return res.redirect('/admin/discounts');
      // }

      // if (!isValidMaxUsage) {
      //   req.session.message = {
      //     type: 'error',
      //     title: 'Invalid Max Usage!',
      //     text: 'Max usage must be an integer between 0 and 10.'
      //   };
    
      //   return res.redirect('/admin/discounts');
        
      // }


      if (!isValidCode) {
        return res.render('error', {
          status: 400,
          errorTitle: "Invalid Discount Code",
          message: "Discount code must be a 5-character alphanumeric string."
        });
      }

      if (!isValidMaxUsage) {
        return res.render('error', {
          status: 400,
          errorTitle: "Invalid Max Usage",
          message: "Max usage must be an integer between 0 and 10."
        });
      }


      const discount = {
        code: discountCode.toUpperCase(),
        value: discountValue,
        maxUsage
      };

      const response = await axios.post(`http://localhost:3003/api/discounts`, discount, {
        headers: {
            'Content-Type': 'application/json'
          }
      });

      const discounts = await axios.get(`http://localhost:3003/api/discounts`);
      const newDiscounts = discounts.data;
  
      res.render('admin/discounts', { discounts: newDiscounts, error: null, title: "Le administrateur - Discount List" });
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

router.post('/discount-delete/:discountId', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
      const discountId = req.params.discountId;

      const response = await axios.delete(`http://localhost:3003/api/discounts/${discountId}`);

      const discounts = await axios.get(`http://localhost:3003/api/discounts`);
      const newDiscounts = discounts.data;
  
      res.render('admin/discounts', { discounts: newDiscounts, error: null, title: "Le administrateur - Discount List" });
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
})

router.post('/check-discount', authenticateUser, async (req, res) => {
  try {
    const code = req.body.code;

    const response = await axios.get(`http://localhost:3003/api/discounts/check-discount/${code}`);

    res.status(response.status).json(response.data);

  } catch (err) {
    console.error(err);

    // Send a proper JSON error for fetch
    res.status(err.response?.status || 500).json({
      success: false,
      message: err.response?.data?.error || 'Inavlid discount code'
    });

  }
});

// router.get('/orders', adminController.renderAdminOrders);

router.get('/orders', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const { userId, page = 1, dateFilter, startDate, endDate, discountId } = req.query;

    // query object
    const queryParams = {
      sort_by: 'created',
      order: 'desc',
      page,
    };

    if (userId) queryParams.userId = userId;
    if (discountId) queryParams.discountId = discountId;
    if (dateFilter && dateFilter === 'custom' && startDate && endDate) {
      queryParams.dateFilter = dateFilter;
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    } else if (dateFilter) {
      queryParams.dateFilter = dateFilter;
    }

    const queryString = qs.stringify(queryParams); 

    const response = await axios.get(`http://localhost:3003/api/orders/sort/filter?${queryString}`);

    const { currentPage, totalPages, totalOrders, orders } = response.data;

    res.render('admin/orders', {
      currentPage,
      totalPages,
      totalOrders,
      orders,
      dateFilter: req.query.dateFilter || 'system',
      discountId: req.query.discountId || 'empty',
      error: null,
      title: "Le administrateur - Order List"
    });

  } catch (err) {
    console.error(err);
    res.render('error', {
      status: err.status,
      errorTitle: "Error Occured",
      message: err.response?.data?.error
    });
  }
});


router.get('/product-details/:id', authenticateUser, requireRole('admin'), async (req, res) => {
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

router.get('/product-create', authenticateUser, requireRole('admin'), async (req, res) => {
  res.render('admin/product-create', { error: null, title: "Le administrateur - Create Product" });
});

router.post('/product-create', authenticateUser, requireRole('admin'),
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

router.post('/product-delete/:id', authenticateUser, requireRole('admin'), async (req, res) => {
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

router.post('/variant-create/:productId', authenticateUser, requireRole('admin'),
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

router.post('/variant-update/:productId/:variantId', authenticateUser, requireRole('admin'),
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

router.post('/variant-delete/:productId/:variantId', authenticateUser, requireRole('admin'), async (req, res) => {
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

router.post('/update-order-status/:orderId', authenticateUser, async (req, res) => {
  try {
  const orderId = req.params.orderId;
  const newStatus = req.body.status;

  const statusHistoryResponse = await axios.get(`http://localhost:3003/api/orders/${orderId}`);
  let statusHistory = statusHistoryResponse.data.statusHistory;
  statusHistory.push({ status: newStatus})

  const order = {
    status: newStatus,
    statusHistory
  }

  const response = await axios.put(`http://localhost:3003/api/orders/${orderId}`, order, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      req.session.message = {
        type: 'success',
        title: 'Updated!',
        text: 'Order Status updated successfully.'
      };

      res.redirect(`/admin/orders`);

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

// router.get('/order-specific-details', adminController.renderAdminOrderSpecificDetails);

router.get('/order-specific-details/:orderId', authenticateUser, requireRole('admin'), async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const response = await axios.get(`http://localhost:3003/api/orders/${orderId}`);
    const order = response.data;

    res.render('admin/order-specific-details', { order, error: null, title: "L'Ordinateur Très Bien - Order Specific Details" });
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

module.exports = router;