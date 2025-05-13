const cartService = require('../services/cartService');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// Helper to determine cart identifier (userId or sessionId)
const getCartIdentifier = (req) => {
    if (req.user && req.user.id) {
        return { userId: req.user.id };
    }
    const sessionId = req.headers['x-session-id']; // Or req.cookies.sessionId, req.body.sessionId etc.
    if (sessionId) {
        return { sessionId };
    }
    return null; // No identifier found
};

const getCart = async (req, res, next) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return next(new AppError('User authentication or session ID required to access cart.', 401));
        }

        const cartViewModel = await cartService.getCart(identifier);
        res.status(200).json({
            status: 'success',
            data: {
                cart: cartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in getCart', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, sessionId: req.headers['x-session-id'] } });
        next(error);
    }
};

const addItem = async (req, res, next) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return next(new AppError('User authentication or session ID required to add items to cart.', 401));
        }
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || quantity === undefined) {
            return next(new AppError('Product ID, Variant ID, and quantity are required.', 400));
        }
        // Quantity validation is handled by cartService

        const updatedCartViewModel = await cartService.addItemToCart(identifier, { productId, variantId, quantity });

        res.status(200).json({
            status: 'success',
            message: 'Item added to cart successfully.',
            data: {
                cart: updatedCartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in addItem', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, sessionId: req.headers['x-session-id'], body: req.body } });
        next(error);
    }
};

const updateItemQuantity = async (req, res, next) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return next(new AppError('User authentication or session ID required to update cart items.', 401));
        }
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined) {
            return next(new AppError('Quantity is required.', 400));
        }
        // Quantity validation (e.g. non-negative) is handled by cartService

        const updatedCartViewModel = await cartService.updateCartItemQuantity(identifier, cartItemId, quantity);

        res.status(200).json({
            status: 'success',
            message: quantity === 0 ? 'Item removed from cart.' : 'Cart item quantity updated successfully.',
            data: {
                cart: updatedCartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in updateItemQuantity', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, sessionId: req.headers['x-session-id'], params: req.params, body: req.body } });
        next(error);
    }
};

const removeItem = async (req, res, next) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return next(new AppError('User authentication or session ID required to remove items from cart.', 401));
        }
        const { cartItemId } = req.params;

        const updatedCartViewModel = await cartService.removeCartItem(identifier, cartItemId);

        res.status(200).json({
            status: 'success',
            message: 'Item removed from cart successfully.',
            data: {
                cart: updatedCartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in removeItem', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, sessionId: req.headers['x-session-id'], params: req.params } });
        next(error);
    }
};

const clearCart = async (req, res, next) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return next(new AppError('User authentication or session ID required to clear cart.', 401));
        }

        const updatedCartViewModel = await cartService.clearCart(identifier);

        res.status(200).json({
            status: 'success',
            message: 'Cart cleared successfully.',
            data: {
                cart: updatedCartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in clearCart', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, sessionId: req.headers['x-session-id'] } });
        next(error);
    }
};

// New controller for merging guest cart to user cart upon login
const mergeCart = async (req, res, next) => {
    try {
        const userId = req.user?.id; // User must be logged in for this operation
        const { sessionId } = req.body; // Expect sessionId of the guest cart from request body

        if (!userId) {
            return next(new AppError('User authentication required to merge carts.', 401));
        }
        if (!sessionId) {
            return next(new AppError('Session ID of the guest cart is required for merging.', 400));
        }

        const mergedCartViewModel = await cartService.mergeGuestCartToUserCart(sessionId, userId);

        res.status(200).json({
            status: 'success',
            message: 'Guest cart merged successfully into user cart.',
            data: {
                cart: mergedCartViewModel,
            },
        });
    } catch (error) {
        logger.error('CartController: Error in mergeCart', { metadata: { error: error.message, stack: error.stack, userId: req.user?.id, body: req.body } });
        next(error);
    }
};

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    mergeCart, // Export new controller
}; 