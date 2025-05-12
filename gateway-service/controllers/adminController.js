
exports.renderAdminDashboard = (req, res) => {
    res.render('admin/dashboard', { error: null, title: "Le administrateur - Dashboard" });
};

exports.renderAdminProducts = (req, res) => {
    res.render('admin/products', { error: null, title: "Le administrateur - Products" });
};

exports.renderAdminUsers = (req, res) => {
    res.render('admin/users', { error: null, title: "Le administrateur - Users" });
};

exports.renderAdminDiscounts = (req, res) => {
    res.render('admin/discounts', { error: null, title: "Le administrateur - Discount Codes" });
};

exports.renderAdminOrders = (req, res) => {
    res.render('admin/orders', { error: null, title: "Le administrateur - Orders" });
};

exports.renderAdminOrderSpecificDetails = (req, res) => {
    res.render('admin/order-specific-details', { error: null, title: "Le administrateur - Order Specific Details" });
};