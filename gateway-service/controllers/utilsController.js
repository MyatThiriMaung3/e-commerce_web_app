exports.renderLogin = (req, res) => {
    const message = req.query.message || null;
    res.render('login', { error: message });
};

exports.renderRegister = (req, res) => {
    res.render('register', { error: null });
};

exports.renderError = (req, res) => {
    res.render('error', { status: 404, errorTitle: "404 Error Occured", message: "Page not found" });
};
