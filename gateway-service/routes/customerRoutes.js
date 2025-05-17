const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const qs = require('qs');
const customerController = require('../controllers/customerController');
const { authenticateUser } = require('../middlewares/auth');



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
    
    console.log('http://localhost:3002/api/products/sort/filter', { params });

    // Make the request to the backend API with the full filter set
    const response = await axios.get('http://localhost:3002/api/products/sort/filter', { 
      params,
      paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
     });



    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});



// router.get('/account', authenticateUser, customerController.renderAccount);

router.get('/account', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const response = await axios.get(`http://localhost:3001/api/users/${userId}`);
    const user = response.data;

    res.render('customer/account', { user, error: null, title: "L'Ordinateur Très Bien - Account" });
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

router.post('/user-profile-update', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword, fullName, email } = req.body;

    if ( newPassword !== confirmPassword) {
      req.session.message = {
        type: 'error',
        title: 'Check!',
        text: 'New password and confirm password do not match. ' + (newPassword !== confirmPassword)
      };
      return res.redirect('/account');
    }

    console.log('User ID:', userId);
    console.log('Current Password:', currentPassword);
    console.log('New Password:', newPassword);
    console.log('Confirm Password:', confirmPassword);
    console.log('Full Name:', fullName);
    console.log('Email:', email);

    const responseCurrentPassword = await axios.get(`http://localhost:3001/api/users/${userId}/password`);
    const storedPasswordHash = responseCurrentPassword.data;

    const isMatch = await bcrypt.compare(currentPassword, storedPasswordHash);

    if (!isMatch) {
      req.session.message = {
        type: 'error',
        title: 'Error Occured!',
        text: 'Current password is incorrect.',
      };
      return res.redirect('/account');
    }

    let user;
    let sessionTitle = 'Password Changed!';
    let sessionText = 'Your password has been changed successfully.';
    if (newPassword && newPassword.length > 0) {
      sessionTitle = 'Password Changed!';
      sessionText = 'Your password has been changed successfully.';
      user = {
        fullName: fullName,
        email: email,
        passwordHash: newPassword
      }
    } else {
      sessionTitle = 'Profile Info Updated!';
      sessionText = 'Your profile information has been updated successfully.';
      user = {
        fullName: fullName,
        email: email,
      }
    }
    

    const response = await axios.put(`http://localhost:3001/api/users/${userId}`, user, {
      headers: {
        'Authorization': `Bearer ${req.user.token}`
      }
    });

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: sessionTitle,
                text: sessionText,
            };
    
    res.redirect('/account');
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

router.post('/user-address-create', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { address, title, city, state, zip } = req.body;

    const newAddress = {
      title,
      address,
      city,
      state,
      zip
    };

    const response = await axios.post(`http://localhost:3001/api/users/${userId}/addresses`, newAddress, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Address Created!',
                text: 'Your address has been created successfully.',
            };
    
    res.redirect('/account');
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

router.post('/user-address-edit', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { address, title, city, state, zip, addressId } = req.body;

    const updateAddress = {
      title,
      address,
      city,
      state,
      zip
    };

    const response = await axios.put(`http://localhost:3001/api/users/${userId}/addresses/${addressId}`, updateAddress, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Address Updated!',
                text: 'Your address has been updated successfully.',
            };
    
    res.redirect('/account');
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

router.post('/address-delete', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.body.addressId;

    const response = await axios.delete(`http://localhost:3001/api/users/${userId}/addresses/${addressId}`, 
    //   {
    //   headers: {
    //     // 'Authorization': `Bearer ${req.user.token}`,
    //     'Content-Type': 'application/json'
    //   }
    // }
  );

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Address Deleted!',
                text: 'Your address has been deleted successfully.',
            };
    
    res.redirect('/account');
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

router.post('/set-address-default', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.body.addressId;

    const user = {
      defaultAddress: addressId,
    };

    const response = await axios.put(`http://localhost:3001/api/users/${userId}`, user,
      {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    }
  );

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Address Set as Default!',
                text: 'Your address has been set as default successfully.',
            };
    
    res.redirect('/account');
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

router.post('/make-comment', async (req, res) => {
  try {

    const { userId, productId, comment } = req.body;

    let newComment;
    if (userId == 'guest') {
      newComment = {
        userId: null,
        productId,
        comment
      };
    } else {

      const currentUser = await axios.get(`http://localhost:3001/api/users/${userId}`);
      const username = currentUser.data.fullName;

      newComment = { 
        userId,
        productId,
        comment,
        username
      };
    }


    const response = await axios.post(`http://localhost:3002/api/comments`, newComment, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    req.session.message = {
                type: 'success',
                title: 'Comment Created!',
                text: 'Your comment has been created successfully.',
            };
    
    res.redirect('/details/' + productId);
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

router.post('/rate-product', authenticateUser, async (req, res) => { 
  try {
    if (!req.user || !req.user.userId) {
      req.session.message = {
        type: 'error',
        title: 'Error Occured!',
        text: 'You must be logged in to rate a product.',
      };

      res.redirect('/login');
    }

    const userId = req.user.userId;
    const { productId, rating, ratingComment } = req.body;

    const currentUser = await axios.get(`http://localhost:3001/api/users/${userId}`);
    const username = currentUser.data.fullName;

    let newRating;
    if (ratingComment == '' || ratingComment == null) {
      newRating = {
        userId,
        productId,
        rating,
        username
      };
    } else {
      newRating = {
        userId,
        productId,
        rating,
        username,
        comment: ratingComment
      };
    }
    

    const response = await axios.post(`http://localhost:3002/api/ratings`, newRating, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    req.session.message = {
                type: 'success',
                title: 'Rating Created!',
                text: 'Your rating has been created successfully.',
            };
    
    res.redirect('/details/' + productId);
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





// router.get('/cart', customerController.renderCart);

router.get('/cart', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const response = await axios.get(`http://localhost:3001/api/users/${userId}`);
    const user = response.data;

    res.render('customer/cart', { user, error: null, title: "L'Ordinateur Très Bien - Cart" });
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

router.post('/cart-product-add', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = {
      productId: req.body.productId,
      variantId: req.body.variantId,
      variantName: req.body.variantName,
      quantity: parseInt(req.body.quantity),
      price: parseFloat(req.body.price),
      image: req.body.image,
      name: req.body.name
    };

    console.log("cart:", cart);

    const response = await axios.post(`http://localhost:3001/api/users/${userId}/cart`, cart, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Item added to cart!',
                text: 'Your cart has been updated successfully.',
            };
    
    res.redirect('/cart');
    // res.json({
    //   success: true,
    //   user: updatedUser,
    //   message: 'Item added to cart successfully'
    // });

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

router.post('/cart-update', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId, quantity } = req.body;

    console.log("userId:", userId);
    console.log("itemId:", itemId);
    console.log("quantity: ", quantity);

    const cart = { quantity };

    const response = await axios.put(`http://localhost:3001/api/users/${userId}/cart/${itemId}`, cart, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Cart Updated!',
                text: 'Your cart has been updated successfully.',
            };
    
    res.json({
      success: true,
      user: updatedUser,
      message: 'Cart updated successfully'
    });
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

router.post('/cart-delete', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.body;

    const response = await axios.delete(`http://localhost:3001/api/users/${userId}/cart/${itemId}`);

    const updatedUser = response.data;
    req.session.user = updatedUser;

    req.session.message = {
                type: 'success',
                title: 'Item Deleted!',
                text: 'Your cart has been updated successfully.',
            };
    
    res.json({
      success: true,
      user: updatedUser,
      message: 'Cart deleted successfully'
    });
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

// router.get('/order-details', customerController.renderOrderDetails);

router.get('/order-details', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const response = await axios.get(`http://localhost:3001/api/users/${userId}`);
    const user = response.data;

    res.render('customer/order-details', { user, error: null, title: "L'Ordinateur Très Bien - Order Details Form" });
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

router.get('/order-specific-details/:orderId', authenticateUser, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const response = await axios.get(`http://localhost:3003/api/orders/${orderId}`);
    const order = response.data;

    res.render('customer/order-specific-details', { order, error: null, title: "L'Ordinateur Très Bien - Order Specific Details" });
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

router.post('/order-summary', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { totalAmount, taxAmount, discountId, discountCode, discountAmount, loyaltyPointsAmount, finalTotalAmount, fullName, email, phone, addressLine, city, state, zip } = req.body;

    // console.log("final total amount: ", req.body.finalTotalAmount);

    let loyaltyPointsUsed = false;
    if (loyaltyPointsAmount !== 0) {
      loyaltyPointsUsed = true;
    }

    let updatedFinalTotalAmount = finalTotalAmount - discountAmount - loyaltyPointsAmount;
    updatedFinalTotalAmount = (updatedFinalTotalAmount < 0) ? 0: updatedFinalTotalAmount;

    const loyaltyPointsEarned = finalTotalAmount * 0.0001;
    const response = await axios.get(`http://localhost:3001/api/users/${userId}/cart`);;
    const items = response.data;
    const address = {
      address: addressLine,
      city,
      state,
      zip
    }

    let order;
    let discountCodeUsed = false;
    if (discountId && discountCode) {
      discountCodeUsed = true;
      order = {
        userId,
        fullName,
        email,
        phone,
        items,
        totalAmount: totalAmount.parse,
        discountId,
        discountCode,
        discountAmount,
        loyaltyPointsAmount,
        taxAmount,
        finalTotalAmount: updatedFinalTotalAmount,
        statusHistory: { status: 'pending' },
        address,
        loyaltyPointsEarned
      }
    } else {
      order = {
        userId,
        fullName,
        email,
        phone,
        items,
        totalAmount,
        discountAmount,
        loyaltyPointsAmount,
        taxAmount,
        finalTotalAmount: updatedFinalTotalAmount,
        statusHistory: { status: 'pending' },
        address,
        loyaltyPointsEarned
      }
    }


    const orderResponse = await axios.post(`http://localhost:3003/api/orders`, order, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (orderResponse.status === 201) {
      const clearCart = await axios.delete(`http://localhost:3001/api/users/${userId}/cart`);

      let ownedLoyaltyPoints = loyaltyPointsEarned;
      if(!loyaltyPointsUsed) {
        const currentLoyaltyPoints = clearCart.data.user.ownedLoyaltyPoints;
        ownedLoyaltyPoints = currentLoyaltyPoints + loyaltyPointsEarned;
      }

      const updateLoyaltyPoints = await axios.put(`http://localhost:3001/api/users/${userId}`, { ownedLoyaltyPoints }, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });


    if (discountCodeUsed) {
      const updateDiscountUsage = await axios.put('http://localhost:3003/api/discounts/usage/increment', { code: discountCode, incrementBy: 1 }, {
        headers: {
          // 'Authorization': `Bearer ${req.user.token}`,
          'Content-Type': 'application/json'
        }
      });
    }
      

      items.forEach(async item => {
        const updateProductSales = await axios.put('http://localhost:3002/api/products/sale/increment', { productId: item.productId, incrementBy: item.quantity }, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });

    const updateProductStock = await axios.put('http://localhost:3002/api/products/stock/decrement', { productId: item.productId, variantId: item.variantId, quantity: item.quantity }, {
      headers: {
        // 'Authorization': `Bearer ${req.user.token}`,
        'Content-Type': 'application/json'
      }
    });
      });
      
    }

    const createdOrder = orderResponse.data;

    req.session.message = {
                type: 'success',
                title: 'Order Placed!',
                text: 'Your order has placed successfully.',
            };

    res.render('customer/order-summary', { order: createdOrder , error: null, title: "L'Ordinateur Très Bien - Order Summary" });
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


// router.get('/order-list', customerController.renderOrderList);

router.get('/order-list', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1 } = req.query;

    const queryParams = {
      sort_by: 'created',
      order: 'desc',
      page,
      userId
    };

    const queryString = qs.stringify(queryParams); 
    
    const response = await axios.get(`http://localhost:3003/api/orders/sort/filter?${queryString}`);
    
    const { currentPage, totalPages, totalOrders, orders } = response.data;
    

    res.render('customer/order-list', { currentPage, totalPages, totalOrders, orders, error: null, title: "L'Ordinateur Très Bien - Order List" });
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

router.post('/update-order-status/:orderId', async (req, res) => {
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

      res.redirect(`/order-list`);

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

// router.get('/order-specific-details', customerController.renderOrderSpecificDetails);
router.get('/success', customerController.renderSuccess);

module.exports = router;