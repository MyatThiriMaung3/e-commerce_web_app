exports.renderLanding = (req, res) => {
    res.render('customer/landing', { error: null, title: "L'Ordinateur Très Bien - Home" });
};

exports.renderDetails = (req, res) => {
    res.render('customer/product-details', { error: null, title: "L'Ordinateur Très Bien - Product Details" });
};

exports.renderProducts = (req, res) => {
    res.render('customer/products', { error: null, title: "L'Ordinateur Très Bien - Products" });
};

exports.renderAccount = (req, res) => {
    const user = req.user;
    console.log(user);
    res.render('customer/account', { user, error: null, title: "L'Ordinateur Très Bien - Account" });
};

exports.renderCart = (req, res) => {
    res.render('customer/cart', { error: null, title: "L'Ordinateur Très Bien - Cart" });
};

exports.renderOrderDetails = (req, res) => {
    res.render('customer/order-details', { error: null, title: "L'Ordinateur Très Bien - Order Details" });
};

exports.renderOrderSummary = (req, res) => {
    res.render('customer/order-summary', { error: null, title: "L'Ordinateur Très Bien - Order Summary" });
};

exports.renderOrderList = (req, res) => {
    res.render('customer/order-list', { error: null, title: "L'Ordinateur Très Bien - Order list" });
};

exports.renderOrderSpecificDetails = (req, res) => {
    res.render('customer/order-specific-details', { error: null, title: "L'Ordinateur Très Bien - Order Specific Details" });
};

exports.renderSuccess = (req, res) => {
    res.render('customer/success', { error: null, title: "L'Ordinateur Très Bien - Success" });
};

