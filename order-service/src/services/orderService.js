const Order = require('../models/Order');
const Discount = require('../models/Discount');
// REMOVE: OutboxMessage import (unless implementing a complex outbox pattern)
// const OutboxMessage = require('../models/OutboxMessage');
const {
    getAuthServiceClient,
    getProductServiceClient,
    deductUserLoyaltyPoints,
    updateUserLoyaltyPoints,
    getUserData // Import combined user data getter
    // REMOVE: sendOrderConfirmationNotification import
} = require('../utils/apiClient');
const { calculateTaxAmount } = require('../utils/calculations');
const mongoose = require('mongoose');
const amqpService = require('./amqpService'); // Import the AMQP service
const logger = require('../config/logger'); // Use logger

// Custom Error for specific checkout/order issues
class OrderProcessingError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'OrderProcessingError';
        this.statusCode = statusCode;
    }
}

/**
 * Processes the checkout, validates items, applies discounts/points,
 * creates the order, and triggers post-order actions.
 */
const processCheckout = async ({ userId, guestData, addressId, discountCode, pointsToUse = 0, authToken }) => {
    // Use logger for consistent logging
    const logMeta = { userId: userId, guestEmail: guestData?.email, addressId, discountCode, pointsToUse };
    logger.info('Checkout process started', { metadata: logMeta });

    let finalUserId = userId;
    let user = null;
    let recipientEmail = null;
    let notificationPayload = null;

    // --- API Clients ---
    const authApiClient = getAuthServiceClient(authToken);
    const productApiClient = getProductServiceClient();

    // 1. Handle Guest vs. Logged-in User
    if (!finalUserId) {
        if (!guestData || !guestData.email || !guestData.fullName) {
            throw new OrderProcessingError('Guest email and fullName are required for guest checkout.', 400);
        }
        logger.info('Guest checkout: Finding or creating user...', { metadata: { email: guestData.email } });
        try {
            // ASSUMPTION: Auth service has POST /api/users/guest (adjusted from find-or-create-guest)
            const response = await authApiClient.post('/api/users/guest', guestData);
            finalUserId = response.data.userId;
            user = response.data.user; // Assuming response includes basic user data { userId, name, email }
            recipientEmail = user?.email || guestData.email;
            logger.info('Found/Created guest user', { metadata: { userId: finalUserId, email: recipientEmail } });
            if (pointsToUse > 0) {
                throw new OrderProcessingError('Guests cannot use loyalty points.', 400);
            }
        } catch (error) {
            logger.error('Error finding/creating guest user', { metadata: { email: guestData.email, error: error.message, status: error.response?.status } });
            throw new OrderProcessingError('Failed to process guest user information.', error.response?.status || 502);
        }
    }

    // 2. Fetch User Details (Cart, Address, Points) for Logged-in Users
    let cartItems = [];
    let shippingAddress = null;
    let availablePoints = 0;
    if (finalUserId && !user) { // Only fetch if user wasn't populated by guest creation
        try {
            logger.info('Fetching details for logged-in user', { metadata: { userId: finalUserId, addressId } });
            // Use the combined getUserData function from apiClient
            const userData = await getUserData(finalUserId, authToken);
            user = userData; // Expects { name, email, loyaltyPoints, addresses: [...] }
            cartItems = userData.cart || []; // ASSUMPTION: Cart is part of user data
            // Find the specific address
            shippingAddress = userData.addresses?.find(addr => addr._id === addressId || addr.id === addressId);
            availablePoints = userData.loyaltyPoints || 0;
            recipientEmail = user?.email;

            if (!cartItems || cartItems.length === 0) throw new OrderProcessingError('Cannot checkout with an empty cart.', 400);
            if (!shippingAddress) throw new OrderProcessingError('Selected shipping address not found.', 404);

            logger.info('Fetched user details', { metadata: { userId: finalUserId, items: cartItems.length, addressFound: !!shippingAddress, points: availablePoints } });
        } catch (error) {
            logger.error('Error fetching user details', { metadata: { userId: finalUserId, error: error.message, status: error.response?.status } });
            if (error.response?.status === 404) throw new OrderProcessingError('Cart, address, or user data not found.', 404);
            throw new OrderProcessingError('Failed to retrieve user cart or address information.', error.response?.status || 502);
        }
    } else if (user) {
        // If guest user was just created, we might need cart/address separately
        // This depends heavily on the Auth service API design - simplifying for now
        // Assuming guest creation doesn't return cart/addresses, need separate calls?
        // Re-evaluating this flow - A guest likely wouldn't have cart/address/points pre-associated
        // The checkout payload likely needs items + address directly for guests?
        // --> Sticking to the logged-in flow for simplicity of this example refactor.
        // --> The guest flow would need significant clarification on API interactions.
        if (!finalUserId) throw new OrderProcessingError('Cannot proceed without user context.', 500); // Safety check
        // If guest was created, we need to assume items/address come from request body, not auth service
        // This requires changing the function signature and request validation schema
        // *** Let's PAUSE guest implementation detail for RabbitMQ refactor clarity ***
        logger.warn('Guest checkout flow detail requires further API clarification.', { metadata: { userId: finalUserId } });
        // Assuming for now guest checkout path won't reach here with points/existing cart
    }

    // Check recipient email again after potentially fetching user data
    if (!recipientEmail) {
        logger.warn('Recipient email could not be determined for notification', { metadata: { userId: finalUserId } });
    }

    // 3. Fetch Product Details & Validate Stock
    let validatedItems = [];
    try {
        logger.info('Fetching product details & validating stock...', { metadata: { itemCount: cartItems.length } });
        const payload = cartItems.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }));
        const response = await productApiClient.post('/api/products/validate-stock', { items: payload });
        validatedItems = response.data.validatedItems;
        logger.info('Items validated and details fetched', { metadata: { validatedCount: validatedItems.length } });
    } catch (error) {
        logger.error('Error validating items with Product Service', { metadata: { error: error.message, status: error.response?.status, responseData: error.response?.data } });
        const errorMsg = error.response?.data?.message || 'Out of stock or invalid item.';
        throw new OrderProcessingError(`Product validation failed: ${errorMsg}`, error.response?.status || 502);
    }

    // 4. Calculate Initial Totals
    let totalAmount = 0;
    const orderItems = validatedItems.map(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        // Ensure we map all necessary fields for the OrderItemSchema
        return {
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            variantName: item.variantName,
            image: item.image,
            quantity: item.quantity,
            price: item.price,
        };
    });
    logger.info('Calculated initial total', { metadata: { totalAmount } });

    // 5. Validate and Apply Discount Code
    let discount = null;
    let discountAmount = 0;
    if (discountCode) {
        logger.info('Attempting to validate discount code', { metadata: { discountCode } });
        try {
            discount = await Discount.findOne({ code: discountCode });
            if (!discount || !discount.isValid()) { // Use the isValid method from the model
                throw new OrderProcessingError('Discount code is invalid, expired, or maximum usage reached.', 400);
            }
            // Applying discount logic (example: percentage)
            if (discount.discountType === 'percentage') {
                 discountAmount = (totalAmount * discount.value) / 100;
            } else if (discount.discountType === 'fixed_amount') {
                 discountAmount = discount.value;
            }
            discountAmount = Math.min(discountAmount, totalAmount); // Cannot discount more than total
            logger.info('Discount applied', { metadata: { discountCode, discountAmount } });
        } catch(err) {
             logger.error('Error validating discount code', { metadata: { discountCode, error: err.message } });
             if (err instanceof OrderProcessingError) throw err;
             throw new OrderProcessingError('Error validating discount code.', 500);
        }
    }

    // 6. Validate and Apply Loyalty Points
    let actualPointsUsed = 0;
    let pointsValueUsed = 0;
    if (finalUserId && pointsToUse > 0) {
        logger.info('Attempting to apply loyalty points', { metadata: { pointsToUse, availablePoints } });
        if (pointsToUse > availablePoints) {
            throw new OrderProcessingError(`Insufficient loyalty points. Available: ${availablePoints}`, 400);
        }
        const pointValue = 1; // TODO: Make configurable
        const maxPointsValueApplicable = totalAmount - discountAmount;
        let calculatedValue = pointsToUse * pointValue;

        if (calculatedValue > maxPointsValueApplicable) {
            pointsValueUsed = maxPointsValueApplicable;
            actualPointsUsed = Math.floor(pointsValueUsed / pointValue);
            logger.warn(`Requested points value exceeds applicable amount. Using points instead.`, { metadata: { calculatedValue, maxPointsValueApplicable, actualPointsUsed } });
        } else {
            actualPointsUsed = pointsToUse;
            pointsValueUsed = calculatedValue;
        }
        logger.info('Loyalty points applied', { metadata: { actualPointsUsed, pointsValueUsed } });
    }

    // 7. Calculate Final Amounts
    const amountAfterDiscountAndPoints = totalAmount - discountAmount - pointsValueUsed;
    const taxRate = 8; // TODO: Make configurable
    const taxAmount = calculateTaxAmount(amountAfterDiscountAndPoints > 0 ? amountAfterDiscountAndPoints : 0, taxRate);
    const shippingFee = 0; // TODO: Implement shipping calculation

    const finalTotalAmount = amountAfterDiscountAndPoints + taxAmount + shippingFee;
    logger.info('Calculated final amounts', { metadata: { taxAmount, shippingFee, finalTotalAmount } });

    // 8. Calculate Loyalty Points Earned (e.g., 10% of final amount before points were used)
    const baseAmountForEarning = totalAmount - discountAmount + taxAmount + shippingFee;
    const loyaltyPointsEarned = finalUserId ? Math.floor(baseAmountForEarning * 0.10) : 0;
    logger.info('Calculated loyalty points earned', { metadata: { loyaltyPointsEarned } });

    // 9. Create Order Object
    const newOrderData = {
        userId: finalUserId,
        items: orderItems,
        totalAmount,
        discountId: discount ? discount._id.toString() : null, // Store as string if needed
        discountCode: discount ? discount.code : null,
        discountAmount,
        tax: taxAmount, // Store calculated tax amount
        shippingFee,
        pointsUsed: actualPointsUsed,
        finalTotalAmount,
        address: shippingAddress, // Use the validated address object
        status: 'pending',
        // statusHistory will be added by pre-save hook
        loyaltyPointsEarned,
        guestEmail: userId ? null : recipientEmail // Store guest email if applicable
    };
    const newOrder = new Order(newOrderData);
    let savedOrder = null;

    // --- Database Transaction --- Start Session
    const session = await mongoose.startSession();
    session.startTransaction();
    logger.info('Database transaction started', { metadata: { sessionId: session.id?.toString() } }); // Add session ID if available

    try {
        // 10. Save Order
        savedOrder = await newOrder.save({ session });
        logger.info('Order saved within transaction', { metadata: { orderId: savedOrder._id, sessionId: session.id?.toString() } });

        // 11. Increment Discount Usage
        if (discount) {
            const updatedDiscount = await Discount.findOneAndUpdate(
                { _id: discount._id, usedCount: { $lt: discount.maxUsage } },
                { $inc: { usedCount: 1 } },
                { session, new: true }
            );
            if (!updatedDiscount) {
                 throw new OrderProcessingError(`Discount code ${discountCode} usage limit reached concurrently.`, 409);
            }
            logger.info('Discount usage incremented', { metadata: { orderId: savedOrder._id, discountCode, sessionId: session.id?.toString() } });
        }

        // REMOVED: Outbox message creation

        // Commit the transaction
        await session.commitTransaction();
        logger.info('Database transaction committed', { metadata: { orderId: savedOrder._id, sessionId: session.id?.toString() } });

    } catch (error) {
        await session.abortTransaction();
        // Log full error object for stack trace
        logger.error('Database transaction aborted', { metadata: { orderId: savedOrder?._id || 'N/A', sessionId: session.id?.toString(), error: error } });
        if (error instanceof OrderProcessingError) throw error;
        throw new OrderProcessingError('Failed to save order data during transaction.', 500);
    } finally {
        await session.endSession();
        logger.info('Database session ended', { metadata: { sessionId: session.id?.toString() } });
    }

    // --- Post-Commit Steps (Publish Notification) ---
    if (savedOrder && recipientEmail) {
        notificationPayload = {
            recipientEmail: recipientEmail,
            orderData: savedOrder.toObject(), // Ensure plain object
            userData: { fullName: user?.name || guestData?.fullName, email: recipientEmail }
        };
        try {
            // Publish to RabbitMQ instead of direct HTTP call
            await amqpService.publishNotification(notificationPayload);
            logger.info('Order confirmation notification published to queue', { metadata: { orderId: savedOrder._id } });
        } catch (amqpError) {
            // Log critical error if publishing fails AFTER commit
            logger.error('CRITICAL: Failed to publish order confirmation to queue after commit', {
                metadata: {
                    orderId: savedOrder._id,
                    error: amqpError,
                    payload: notificationPayload // Log payload for retry if needed
                }
            });
            // Do NOT throw error here, as the order is already saved.
        }
    } else if (savedOrder) {
         logger.warn('Skipping notification publish: recipient email unknown', { metadata: { orderId: savedOrder._id } });
    }

    // --- Post-Order Background Tasks (Stock, Loyalty) ---
    if (savedOrder) {
        const postOrderTasks = [];
        // Decrement Stock
        postOrderTasks.push(
            productApiClient.post('/api/products/decrement-stock', { items: savedOrder.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) })
                .then(() => logger.info('Stock decrement request successful', { metadata: { orderId: savedOrder._id } }))
                .catch(err => logger.error('Post-Order Task Failed: Stock Decrement', { metadata: { orderId: savedOrder._id, error: err.response?.data || err } })) // Log full error
        );
        // Update Loyalty Points (Deduct/Add)
        if (finalUserId && savedOrder.pointsUsed > 0) {
            postOrderTasks.push(
                deductUserLoyaltyPoints(finalUserId, savedOrder.pointsUsed, authToken)
                    .then(() => logger.info('Post-Order Task Successful: Points Deduction', { metadata: { orderId: savedOrder._id, userId: finalUserId, points: savedOrder.pointsUsed } }))
                    .catch(err => logger.error('Post-Order Task Failed: Points Deduction', { metadata: { orderId: savedOrder._id, userId: finalUserId, error: err } })) // Log full error
            );
        }
        if (finalUserId && savedOrder.loyaltyPointsEarned > 0) {
            postOrderTasks.push(
                updateUserLoyaltyPoints(finalUserId, savedOrder.loyaltyPointsEarned, authToken)
                    .then(() => logger.info('Post-Order Task Successful: Points Addition', { metadata: { orderId: savedOrder._id, userId: finalUserId, points: savedOrder.loyaltyPointsEarned } }))
                    .catch(err => logger.error('Post-Order Task Failed: Points Addition', { metadata: { orderId: savedOrder._id, userId: finalUserId, error: err } })) // Log full error
            );
        }
        // Don't await these, let them run in background
        Promise.allSettled(postOrderTasks).then((results) => {
             logger.info('Post-order background tasks initiated/completed', { metadata: { orderId: savedOrder._id, resultsCount: results.length } });
        });
    }

    logger.info('Checkout process completed successfully', { metadata: { orderId: savedOrder?._id } });
    return savedOrder;
};

/**
 * Retrieves order history for a specific user.
 */
const getOrderHistory = async (userId) => {
    if (!userId) {
        logger.error('Attempted to fetch order history without userId');
        throw new OrderProcessingError('User ID is required to fetch order history.', 400);
    }
    logger.info('Fetching order history', { metadata: { userId } });
    // Add pagination later if needed
    const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
    logger.info('Retrieved order history', { metadata: { userId, count: orders.length } });
    return orders;
};

/**
 * Retrieves a specific order by its ID, ensuring it belongs to the requesting user.
 */
const getOrderById = async (orderId, userId) => {
    if (!userId) {
        logger.error('Attempted to fetch order details without userId', { metadata: { orderId } });
        throw new OrderProcessingError('User ID is required to fetch order details.', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
         logger.warn('Invalid Order ID format received', { metadata: { orderId, userId } });
         throw new OrderProcessingError('Invalid Order ID format', 400);
    }
    logger.info('Fetching order by ID', { metadata: { orderId, userId } });
    const order = await Order.findOne({ _id: orderId, userId: userId });

    if (!order) {
        logger.warn('Order not found or access denied', { metadata: { orderId, userId } });
        throw new OrderProcessingError('Order not found or access denied.', 404);
    }
    logger.info('Retrieved order details', { metadata: { orderId, userId } });
    return order;
};

module.exports = {
    processCheckout,
    getOrderHistory,
    getOrderById,
    OrderProcessingError // Export the custom error
}; 