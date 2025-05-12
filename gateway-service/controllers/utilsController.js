exports.renderLogin = (req, res) => {
    res.render('login', { error: null });
};

exports.renderLogout = (req, res) => {
    res.render('login', { error: "logout is pressed" });
};

exports.renderRegister = (req, res) => {
    res.render('register', { error: null });
};

exports.renderError = (req, res) => {
    res.render('error', { status: 404, errorTitle: "404 Error Occured", message: "Page not found" });
};