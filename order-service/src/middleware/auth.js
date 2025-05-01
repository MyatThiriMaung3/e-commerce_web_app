// Placeholder Authentication Middleware
// This will need actual JWT verification logic, likely using jsonwebtoken library
// and a secret key from environment variables.
// It might also involve checking token validity with the Auth service.

const jwt = require('jsonwebtoken');
require('dotenv').config(); // Make sure env vars are loaded

const authenticate = (req, res, next) => {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if not token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Extract token
        const token = authHeader.split(' ')[1];

        // Verify token
        // We assume the secret is stored in an environment variable JWT_SECRET
        // The payload is expected to contain at least { userId, role }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload to request object
        // IMPORTANT: Ensure the payload structure from auth-service matches this (e.g., uses 'userId' and 'role')
        req.user = decoded; // The entire decoded payload is attached

        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: 'Token is not valid' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token is expired' });
        }
        res.status(500).json({ msg: 'Server Error during token verification' });
    }
};

const isAdmin = (req, res, next) => {
    // Assumes authenticate middleware has run and attached req.user
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
    }
};

module.exports = { authenticate, isAdmin }; 