const jwt = require('jsonwebtoken');

exports.authenticateUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    console.log('No token found');
    return res.redirect('/login?message=You need to login to access previous page or to do previous action.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded token to request
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.redirect('/login?message=Invalid token, please login again');
  }
};

exports.restrictGuestUsers = (req, res, next) => {
  if (req.user?.isGuest) {
    return res.redirect('/login?message=You need to register or login to access this page.');
  }
  next();
};

exports.requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      // return res.status(403).send('Forbidden');

      return res.render(
            'error', 
            { status: 403, 
                errorTitle: "Forbidden", 
                message: "You need admin access to view this page" 
            }
        );
    }
    next();
  };
};