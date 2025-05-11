exports.renderLanding = (req, res) => {
    res.render('customer/landing', { error: null, title: "L'Ordinateur Très Bien - Home" });
};

exports.renderLogin = (req, res) => {
    res.render('login', { error: null });
};

exports.renderLogout = (req, res) => {
    res.render('login', { error: "logout is pressed" });
};

exports.renderRegister = (req, res) => {
    res.render('register', { error: null });
};

exports.renderDetails = (req, res) => {
    res.render('customer/product-details', { error: null, title: "L'Ordinateur Très Bien - Product Details" });
};

exports.renderProducts = (req, res) => {
    res.render('customer/products', { error: null, title: "L'Ordinateur Très Bien - Products" });
};

exports.renderAccount = (req, res) => {
    res.render('customer/account', { error: null, title: "L'Ordinateur Très Bien - Account" });
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

exports.renderError = (req, res) => {
    res.render('error', { status: 404, errorTitle: "404 Error Occured", message: "Page not found" });
};