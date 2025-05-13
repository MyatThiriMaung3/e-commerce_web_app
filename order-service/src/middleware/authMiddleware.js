const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
// const apiClient = require('../utils/apiClient'); // Not used here directly for now
require('dotenv').config(); // Ensure .env is loaded if not already by server.js

const JWT_SECRET = process.env.JWT_SECRET;

// Use a valid-looking hex string for mock IDs
const MOCK_GUEST_USER_ID = '605160516051605160516051'; // 12-byte hex string
const MOCK_AUTHENTICATED_USER_ID = '605160516051605160516052'; // Different 12-byte hex

const checkGuestOrUser = async (req, res, next) => {
    let identifiedVia = null;
    let tokenValid = false;

    // 1. Check for Bearer Token (regardless of mock setting, a real token should override mocks)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            if (token && JWT_SECRET) {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.id) {
                    req.user = { id: decoded.id, role: decoded.role || 'user' };
                    identifiedVia = 'token';
                    tokenValid = true; // Mark token as successfully processed
                    logger.info('checkGuestOrUser: User identified from valid token', { userId: req.user.id });
                } else {
                    logger.warn('checkGuestOrUser: Token decoded but did not contain an ID.');
                }
            } else if (token && !JWT_SECRET) {
                 logger.warn('JWT_SECRET is not defined. Cannot validate token.');
            }
        } catch (error) {
            logger.warn('checkGuestOrUser: Optional JWT verification failed (likely expired/invalid).', { error: error.message });
            // Token was present but invalid, don't set user from token.
        }
    }

    // 2. If no user identified via a VALID token, check for Session ID Header
    const guestSessionId = req.headers['x-session-id'];
    if (!tokenValid && guestSessionId) {
        identifiedVia = 'session';
        logger.info('checkGuestOrUser: Guest session ID found in header. User object not set by middleware.', { sessionId: guestSessionId });
        // IMPORTANT: Do NOT set req.user here. Let controllers/services use the header.
    }

    // 3. If mocks are enabled AND still no identity established (no valid token, no session header), set mock guest USER
    if (!identifiedVia && process.env.USE_MOCK_AUTH_SERVICE === 'true') {
        req.user = { id: MOCK_GUEST_USER_ID, name: 'Mock Guest', role: 'guest' };
        identifiedVia = 'mock_default';
        logger.info('checkGuestOrUser: Mock guest user set (Fallback: Mocks enabled, no valid token/session header).', { userId: req.user.id });
    }

    // 4. Log if still unidentified
    if (!identifiedVia) {
        logger.info('checkGuestOrUser: No user or guest session established by middleware.');
    }

    next();
};

const protect = (req, res, next) => {
    // If mocks are enabled, ensure *some* user exists for protected routes
    if (process.env.USE_MOCK_AUTH_SERVICE === 'true') {
        if (!req.user) { // If checkGuestOrUser didn't set one (e.g., because session header was present)
            req.user = { id: MOCK_AUTHENTICATED_USER_ID, name: 'Mock Admin', email: 'admin@example.com', role: 'admin' }; 
            logger.info('Protect Middleware: Mock ADMIN user set (USE_MOCK_AUTH_SERVICE is true and no previous user).', { userId: req.user.id, role: req.user.role });
        } else {
            logger.info('Protect Middleware: Proceeding with user/guest set by checkGuestOrUser (Mocks enabled).', { user: req.user });
        }
        return next();
    }

    // If not using mocks, require a valid user set by token check
    if (req.user) { // checkGuestOrUser might have already validated token
         logger.info('Protect Middleware: User authenticated via checkGuestOrUser.', { userId: req.user.id });
         return next();
    }
    
    // Attempt token validation here if checkGuestOrUser didn't set req.user
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            if (token && JWT_SECRET) {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.id) {
                    req.user = { id: decoded.id, role: decoded.role || 'user' };
                    logger.info('Protect Middleware: User authenticated via token (validated here).', { userId: req.user.id });
                    return next();
                }
            }
        } catch (error) {
            logger.error('Protect Middleware: Token verification failed.', { error: error.message });
            return next(new AppError('Not authorized, token failed.', 401));
        }
    }
    
    logger.warn('Protect Middleware: No user and not using mocks or no valid token. Access denied.');
    return next(new AppError('Not authorized. A valid token is required.', 401));
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        logger.info('AdminOnly Middleware: Admin access granted.', { userId: req.user.id });
        return next();
    }
    // Mock admin check remains the same
    if (process.env.USE_MOCK_AUTH_SERVICE === 'true' && req.user && req.user.id === MOCK_AUTHENTICATED_USER_ID && req.user.role === 'admin') {
        logger.info('AdminOnly Middleware: Mock admin access granted.');
        return next();
    }

    logger.warn('AdminOnly Middleware: Access denied.', { userId: req.user?.id, role: req.user?.role });
    return next(new AppError('Forbidden: Admin access required.', req.user ? 403 : 401));
};

module.exports = { protect, adminOnly, checkGuestOrUser }; 