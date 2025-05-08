const mongoose = require('mongoose');
const Cart = require('../models/Cart'); // Use internal Cart model
const apiClient = require('../utils/apiClient'); // Keep for product validation
const logger = require('../config/logger');
// const { OrderProcessingError } = require('./orderService'); // Removed to avoid circular dependency
const AppError = require('../utils/AppError');

// Helper to validate the identifier
const validateIdentifier = (identifier) => {
    if (!identifier || (typeof identifier !== 'object')) {
        throw new AppError('Cart identifier is required.', 400);
    }
    const hasUserId = identifier.userId && mongoose.Types.ObjectId.isValid(identifier.userId);
    const hasSessionId = identifier.sessionId && typeof identifier.sessionId === 'string';

    if (!hasUserId && !hasSessionId) {
        throw new AppError('Valid userId or sessionId must be provided for cart operations.', 400);
    }
    if (hasUserId && hasSessionId) {
        // This case should ideally be prevented by Cart model validation, but good to check here too.
        throw new AppError('Cannot provide both userId and sessionId for cart operations.', 400);
    }
    return hasUserId ? { userId: identifier.userId } : { sessionId: identifier.sessionId };
};

// Internal helper to find or create a cart based on identifier (userId or sessionId)
const getOrCreateCartByIdentifier = async (identifier) => {
    const validIdentifier = validateIdentifier(identifier);
    const query = validIdentifier.userId ? { userId: validIdentifier.userId } : { sessionId: validIdentifier.sessionId };
    
    let cart = await Cart.findOne(query);
    if (!cart) {
        cart = new Cart({ ...query, items: [] });
        await cart.save();
        logger.info('CartService: Created new cart', { metadata: query });
    }
    return cart;
};

const getCart = async (identifier) => {
    const validIdentifier = validateIdentifier(identifier);
    logger.info('CartService: Get cart', { metadata: validIdentifier });
    try {
        const cart = await getOrCreateCartByIdentifier(validIdentifier);
        
        const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        // totalPrice is a virtual property on the Cart model

        return {
            _id: cart._id,
            userId: cart.userId,
            sessionId: cart.sessionId,
            items: cart.items.map(item => ({
                cartItemId: item._id,
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                variantName: item.variantName,
                image: item.image,
                quantity: item.quantity,
                priceAtAdd: item.priceAtAdd,
            })),
            lastUpdatedAt: cart.lastUpdatedAt,
            totalQuantity,
            totalPrice: cart.totalPrice // Use the virtual
        };
    } catch (error) {
        logger.error('CartService: Error getting cart', { metadata: { ...validIdentifier, error: error.message, stack: error.stack } });
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Could not retrieve cart.', error.statusCode || 500);
    }
};

const addItemToCart = async (identifier, itemData) => {
    const validIdentifier = validateIdentifier(identifier);
    const { productId, variantId, quantity } = itemData;
    logger.info('CartService: Add item to cart', { metadata: { ...validIdentifier, productId, variantId, quantity } });

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
        throw new AppError('Invalid product or variant ID format.', 400);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new AppError('Quantity must be a positive integer.', 400);
    }

    const itemsToValidate = [{ productId: productId.toString(), variantId: variantId.toString(), quantity }];
    let validatedItems;
    try {
        validatedItems = await apiClient.validateProductItems(itemsToValidate);
    } catch (error) {
        logger.error('Error validating product with Product Service:', error);
        throw new AppError(`Unable to validate product: ${error.message}`, error.statusCode || 503);
    }

    if (!validatedItems || validatedItems.length === 0 || !validatedItems[0]) {
        throw new AppError('Product validation failed or product not found.', 404);
    }
    const validatedItem = validatedItems[0];

    if (validatedItem.availableStock < quantity) {
        throw new AppError(`Insufficient stock for ${validatedItem.name}. Available: ${validatedItem.availableStock}`, 400);
    }

    const cart = await getOrCreateCartByIdentifier(validIdentifier);

    const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId.toString() && item.variantId.toString() === variantId.toString()
    );

    if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
        // Update denormalized fields if necessary
        cart.items[existingItemIndex].name = validatedItem.name;
        cart.items[existingItemIndex].variantName = validatedItem.variantName;
        cart.items[existingItemIndex].image = validatedItem.image;
        // priceAtAdd should remain from the first time it was added, or update if business rule changes
        // cart.items[existingItemIndex].priceAtAdd = validatedItem.price; 
    } else {
        cart.items.push({
            productId,
            variantId,
            quantity,
            priceAtAdd: validatedItem.price,
            name: validatedItem.name,
            variantName: validatedItem.variantName,
            image: validatedItem.image,
        });
    }
    await cart.save();
    logger.info(`Item ${productId}/${variantId} added/updated in cart`, { metadata: validIdentifier });
    return getCart(validIdentifier); // Return the updated cart view
};

const updateCartItemQuantity = async (identifier, cartItemId, quantity) => {
    const validIdentifier = validateIdentifier(identifier);
    logger.info('CartService: Update cart item quantity', { metadata: { ...validIdentifier, cartItemId, quantity } });

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
        throw new AppError('Invalid cart item ID format.', 400);
    }

    if (quantity === 0) { // A quantity of 0 means remove the item
        return removeCartItem(validIdentifier, cartItemId);
    }
    if (!Number.isInteger(quantity) || quantity < 0) { // Allow positive or 0 (handled above)
        throw new AppError('Quantity must be a non-negative integer.', 400);
    }
    
    try {
        const cart = await Cart.findOne(validIdentifier.userId ? { userId: validIdentifier.userId } : { sessionId: validIdentifier.sessionId });
        if (!cart) {
            throw new AppError('Cart not found.', 404);
        }

        const item = cart.items.id(cartItemId);
        if (!item) {
            throw new AppError('Item not found in cart.', 404);
        }

        // Optionally, re-validate stock if quantity increases significantly
        // For now, directly update.
        item.quantity = quantity;
        await cart.save();
        logger.info('CartService: Item quantity updated in cart', { metadata: { ...validIdentifier, cartItemId } });
        
        return await getCart(validIdentifier);

    } catch (error) {
        logger.error('CartService: Error updating cart item quantity', { metadata: { ...validIdentifier, cartItemId, quantity, error: error.message, stack: error.stack } });
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Could not update item quantity.', error.statusCode || 500);
    }
};

const removeCartItem = async (identifier, cartItemId) => {
    const validIdentifier = validateIdentifier(identifier);
    logger.info('CartService: Remove item from cart', { metadata: { ...validIdentifier, cartItemId } });

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
        throw new AppError('Invalid cart item ID format.', 400);
    }

    try {
        const cart = await Cart.findOne(validIdentifier.userId ? { userId: validIdentifier.userId } : { sessionId: validIdentifier.sessionId });
        if (!cart) {
            logger.warn('CartService: Attempted to remove item from non-existent cart', { metadata: validIdentifier });
            return getCart(validIdentifier); // Or throw 404 if cart must exist
        }

        const item = cart.items.id(cartItemId);
        if (!item) {
            logger.warn('CartService: Item to remove not found in cart', { metadata: { ...validIdentifier, cartItemId } });
            return getCart(validIdentifier); // Return current state
        }

        cart.items.pull({ _id: cartItemId });

        await cart.save();
        logger.info('CartService: Item removed from cart', { metadata: { ...validIdentifier, cartItemId } });
        
        return await getCart(validIdentifier);

    } catch (error) {
        logger.error('CartService: Error removing item from cart', { metadata: { ...validIdentifier, cartItemId, error: error.message, stack: error.stack } });
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Could not remove item from cart.', error.statusCode || 500);
    }
};

const clearCart = async (identifier, session = null) => {
    const validIdentifier = validateIdentifier(identifier);
    logger.info('CartService: Clear cart', { metadata: validIdentifier });
    
    try {
        const query = validIdentifier.userId ? { userId: validIdentifier.userId } : { sessionId: validIdentifier.sessionId };
        const cart = await Cart.findOne(query).session(session);
        
        if (cart) {
            cart.items = [];
            await cart.save({ session });
            logger.info('CartService: Cart cleared', { metadata: validIdentifier });
        }
        // If no cart, it's effectively cleared.
        
        return await getCart(validIdentifier);

    } catch (error) {
        logger.error('CartService: Error clearing cart', { metadata: { ...validIdentifier, error: error.message, stack: error.stack } });
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Could not clear cart.', error.statusCode || 500);
    }
};

// This function could be useful for merging a guest cart to a user cart upon login
const mergeGuestCartToUserCart = async (sessionId, userId) => {
    if (!sessionId || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Valid sessionId and userId are required for merging carts.', 400);
    }
    logger.info('CartService: Attempting to merge guest cart to user cart', { metadata: { sessionId, userId }});

    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
        logger.info('CartService: No guest cart or empty guest cart found to merge.', { metadata: { sessionId }});
        if (guestCart) await Cart.deleteOne({ sessionId }); // Clean up empty guest cart
        return getOrCreateCartByIdentifier({ userId }); // Return user's cart (possibly new)
    }

    const userCart = await getOrCreateCartByIdentifier({ userId });

    // Iterate over guest cart items and add/update them in the user's cart
    for (const guestItem of guestCart.items) {
        const existingItemIndex = userCart.items.findIndex(
            item => item.productId.toString() === guestItem.productId.toString() && 
                    item.variantId.toString() === guestItem.variantId.toString()
        );

        if (existingItemIndex > -1) {
            // Item exists in user's cart, sum quantities
            // Consider stock re-validation if merging significant quantities, for now sum.
            userCart.items[existingItemIndex].quantity += guestItem.quantity;
            // Optionally, decide which priceAtAdd or other details to keep (e.g., oldest, newest)
            // For simplicity, user's existing item details are kept, only quantity is added.
        } else {
            // Item does not exist in user's cart, add it
            userCart.items.push({
                productId: guestItem.productId,
                variantId: guestItem.variantId,
                quantity: guestItem.quantity,
                priceAtAdd: guestItem.priceAtAdd,
                name: guestItem.name,
                variantName: guestItem.variantName,
                image: guestItem.image,
            });
        }
    }

    await userCart.save();
    await Cart.deleteOne({ sessionId }); // Remove guest cart after successful merge

    logger.info('CartService: Guest cart merged successfully into user cart.', { metadata: { sessionId, userId }});
    return getCart({ userId }); // Return the updated user cart view
};

module.exports = {
    getCart,
    addItemToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    mergeGuestCartToUserCart, // New utility function
}; 