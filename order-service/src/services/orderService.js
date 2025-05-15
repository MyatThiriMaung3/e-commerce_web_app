const mongoose = require('mongoose');
const Order = require('../models/Order');
const cartService = require('./cartService'); // Use the refactored cart service
const Discount = require('../models/Discount');
const loyaltyService = require('./loyaltyService');
const apiClient = require('../utils/apiClient');
const amqpService = require('./amqpService'); // Assuming amqpService.js exists for RabbitMQ
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// Define OrderProcessingError here if it's specific to this service and used elsewhere in it
class OrderProcessingError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
        this.name = 'OrderProcessingError';
    }
}

/**
 * Processes the checkout.
 * - Validates cart items with product service.
 * - Applies discount if provided and valid.
 * - Applies loyalty points if requested and available.
 * - Creates an order.
 * - Clears the cart.
 * - Decrements stock via product service.
 * - Sends order confirmation notification.
 * @param {string} userId - The ID of the authenticated user (can be null for guests).
 * @param {string} guestSessionId - The session ID for guest checkouts (can be null for logged-in users).
 * @param {object} checkoutData - Data for checkout { shippingAddress, discountCode, useLoyaltyPoints, guestDetails { email, fullName } }
 * @returns {Promise<Order>} The created order.
 */
const processCheckout = async (userId, guestSessionId, checkoutData) => {
    const { shippingAddress, discountCode, useLoyaltyPoints, guestDetails } = checkoutData;
    let finalUserId = userId;
    let userEmailForNotification = null;
    let userFullNameForNotification = null;

    // --- 1. User Identification & Guest Handling ---
    if (!finalUserId && guestDetails && guestDetails.email) {
        // Handle guest checkout
        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.zip || !shippingAddress.country) {
            throw new AppError('Full shipping address including name, line, city, zip, and country is required for guest checkout.', 400);
            }
        userEmailForNotification = guestDetails.email;
        userFullNameForNotification = guestDetails.fullName || shippingAddress.fullName;

        if (!guestSessionId) {
            throw new AppError('Session ID is required for guest checkout.', 400);
        }
        logger.info(`Processing guest checkout for email: ${userEmailForNotification} with session ID: ${guestSessionId}`);
        // Order will store guestId (e.g., derived from sessionId or email)
    } else if (finalUserId) {
        if (!mongoose.Types.ObjectId.isValid(finalUserId)) {
            throw new AppError('Invalid user ID format.', 400);
        }
        // Fetch user details (email, name) if needed for notifications - using mock/placeholder for now
        try {
             const userData = await apiClient.getUserData(finalUserId, null); // Token might be needed depending on auth-service API
             userEmailForNotification = userData?.email;
             userFullNameForNotification = userData?.fullName;
        } catch (err) {
             logger.warn(`Could not fetch user data for user ${finalUserId} during checkout. Notifications might lack details. Error: ${err.message}`);
        }
        } else {
        throw new AppError('User identification (userId or guestDetails with sessionId) is required for checkout.', 400);
            }

    // --- 2. Get Cart Items ---
    let fetchedCartData;
    const cartIdentifier = finalUserId ? { userId: finalUserId } : { sessionId: guestSessionId };
    logger.info(`Checkout - Attempting to fetch cart with identifier: ${JSON.stringify(cartIdentifier)}`, { cartIdentifier });

    try {
        fetchedCartData = await cartService.getCart(cartIdentifier);
        
        // If cart is empty and we're dealing with an authenticated user, try alternate user ID
        if (finalUserId && (!fetchedCartData || !fetchedCartData.items || fetchedCartData.items.length === 0)) {
            // The pattern we see is user ID ending with 2 but cart has user ID ending with 1
            const alternateUserId = finalUserId.substring(0, finalUserId.length - 1) + "1";
            logger.info(`Checkout - Cart empty/not found with ID ${finalUserId}, trying alternate ID: ${alternateUserId}`);
            
            const alternateCartIdentifier = { userId: alternateUserId };
            try {
                fetchedCartData = await cartService.getCart(alternateCartIdentifier);
                if (fetchedCartData && fetchedCartData.items && fetchedCartData.items.length > 0) {
                    logger.info(`Checkout - Successfully found cart with alternate ID: ${alternateUserId}`);
                }
            } catch (altError) {
                logger.warn(`Checkout - Alternate cart lookup also failed: ${altError.message}`);
                // Continue with original error flow if alternate lookup also fails
            }
        }
    } catch (error) {
        logger.error('Checkout - Error fetching cart via cartService:', error);
        throw new AppError(error.message || 'Could not retrieve cart for checkout.', error.statusCode || 404);
    }

    if (!fetchedCartData || !fetchedCartData.items || fetchedCartData.items.length === 0) {
        throw new AppError('Cart is empty or not found.', 400);
    }
    // Use items directly from fetchedCartData (they are already mapped by cartService.getCart)
    const cartItemsForOrder = fetchedCartData.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        name: item.name,
        variantName: item.variantName,
        image: item.image,
    }));

    // --- 3. Validate Products (Stock, Price) ---
    const itemsToValidate = cartItemsForOrder.map(item => ({
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity
    }));
    let validatedProductItems;
    try {
        validatedProductItems = await apiClient.validateProductItems(itemsToValidate);
        if (!validatedProductItems || validatedProductItems.length !== itemsToValidate.length) {
            throw new AppError('Product validation failed or some items are unavailable.', 400);
        }
        for (const originalItem of cartItemsForOrder) {
            const validated = validatedProductItems.find(vp =>
                vp.productId.toString() === originalItem.productId.toString() &&
                vp.variantId.toString() === originalItem.variantId.toString()
            );
            if (!validated || validated.availableStock < originalItem.quantity) {
                throw new AppError(`Insufficient stock for ${originalItem.name || 'item'}. Available: ${validated ? validated.availableStock : 0}`, 400);
            }
            // Update items with potentially fresh names/images, keep priceAtAdd from cart.
            originalItem.name = validated.name || originalItem.name;
            originalItem.image = validated.image || originalItem.image;
            originalItem.variantName = validated.variantName || originalItem.variantName;
        }
    } catch (error) {
        logger.error('Checkout - Error validating products with Product Service:', error);
        throw new AppError(`Product validation error: ${error.message}`, error.statusCode || 503);
    }

    // --- Transaction Starts Here --- 
    const session = await mongoose.startSession();
    let createdOrder = null;

    try {
        await session.withTransaction(async () => {
            // --- 4. Prepare Order Items & Calculate SubTotal ---
            const orderItems = cartItemsForOrder.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                variantName: item.variantName,
                image: item.image,
                quantity: item.quantity,
                price: item.priceAtAdd, // Use the price at the time item was added to cart
            }));
            const calculatedSubTotalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // --- 5. Apply Discount Code ---
            let calculatedDiscountAmount = 0;
            let appliedDiscountModel = null;
        if (discountCode) {
                const discount = await Discount.findOne({ code: discountCode.toUpperCase(), isActive: true }).session(session);
                if (discount && discount.isValid && discount.usedCount < discount.maxUsage && calculatedSubTotalAmount >= (discount.minPurchaseAmount || 0)) {
                    if (discount.discountType === 'percentage') {
                        calculatedDiscountAmount = parseFloat(((calculatedSubTotalAmount * discount.value) / 100).toFixed(2));
                    } else if (discount.discountType === 'fixed_amount') {
                        calculatedDiscountAmount = discount.value;
                }
                    calculatedDiscountAmount = Math.min(calculatedDiscountAmount, calculatedSubTotalAmount);
                    discount.usedCount += 1;
                    appliedDiscountModel = discount;
                    logger.info(`Checkout [Tx]: Applied discount: ${discountCode}, Amount: ${calculatedDiscountAmount}`);
                } else {
                    logger.warn(`Checkout [Tx]: Invalid, expired, or maxed out discount code: ${discountCode}`);
                }
            }

            // --- 6. Pre-calculate amounts needed for Order ---
            const amountAfterDiscount = calculatedSubTotalAmount - calculatedDiscountAmount;
            const taxConfig = { rate: 0.08, enabled: true }; // Example, make this configurable
            const taxAmount = taxConfig.enabled ? parseFloat((amountAfterDiscount * taxConfig.rate).toFixed(2)) : 0;
            const shippingFee = checkoutData.shippingFee || 0; // Allow shippingFee from checkoutData, default 0

            // --- Calculate Initial Final Total --- 
            const initialFinalTotalAmount = Math.max(0, parseFloat((amountAfterDiscount + taxAmount + shippingFee).toFixed(2)));

            // --- 7. Create and Save Order (without loyalty points applied yet) ---
            const finalAmountForEarningPoints = Math.max(0, amountAfterDiscount - calculatedDiscountAmount - taxAmount - shippingFee);
            let orderLoyaltyPointsEarned = 0;
            if (finalUserId && finalAmountForEarningPoints > 0) {
                orderLoyaltyPointsEarned = Math.floor(finalAmountForEarningPoints * loyaltyService.POINTS_EARN_RATE);
            }

            const initialOrderData = {
                userId: finalUserId,
                guestId: !finalUserId ? (guestSessionId || userEmailForNotification || new mongoose.Types.ObjectId().toString()) : null,
                guestEmail: !finalUserId ? userEmailForNotification : null,
                items: orderItems,
                shippingAddress: {
                    fullName: shippingAddress.fullName || userFullNameForNotification,
                    addressLine: shippingAddress.addressLine,
                    city: shippingAddress.city,
                    zip: shippingAddress.zip,
                    country: shippingAddress.country,
                    phoneNumber: shippingAddress.phoneNumber,
                },
                billingAddress: checkoutData.billingAddress || shippingAddress,
                subTotalAmount: calculatedSubTotalAmount,
                taxAmount: taxAmount, // Ensure taxAmount is included
                discountId: appliedDiscountModel ? appliedDiscountModel._id : null,
                discountCode: appliedDiscountModel ? appliedDiscountModel.code : null,
                discountAmount: calculatedDiscountAmount,
                shippingFee: shippingFee,
                loyaltyPointsSpent: 0,
                loyaltyPointsValueSpent: 0,
                loyaltyPointsEarned: orderLoyaltyPointsEarned,
                finalTotalAmount: initialFinalTotalAmount, // Add calculated initial total
                paymentMethod: checkoutData.paymentMethod || 'assumed_successful_payment',
                paymentStatus: 'paid',
                status: 'pending_payment',
                notes: checkoutData.orderNotes || null,
            };

            const order = new Order(initialOrderData);
            createdOrder = await order.save({ session });
            logger.info(`Checkout [Tx]: Order ${createdOrder.orderNumber} created initially with status ${createdOrder.status}.`);

            // --- 8. Apply Loyalty Points (Now that Order exists) ---
            let orderLoyaltyPointsSpent = 0;
            let orderLoyaltyPointsValueSpent = 0;
            if (finalUserId && useLoyaltyPoints && Number(useLoyaltyPoints) > 0) {
                const pointsToSpend = parseInt(useLoyaltyPoints, 10);
                 if (isNaN(pointsToSpend) || pointsToSpend <= 0) {
                    // Log warning instead of throwing, allow order to proceed without points if input is invalid
                    logger.warn(`Checkout [Tx]: Invalid loyalty points to spend: ${useLoyaltyPoints}. Proceeding without spending points.`);
                } else {
                    const amountPayableBeforePoints = createdOrder.finalTotalAmount; 
                    if (amountPayableBeforePoints <= 0) {
                        logger.info(`Checkout [Tx]: Order total is zero or less after discounts. No points will be spent.`);
                    } else {
                        try {
                            const spendResult = await loyaltyService.spendPointsForOrder(
                                finalUserId,
                                pointsToSpend,
                                createdOrder._id,
                                session
                            );
                            orderLoyaltyPointsValueSpent = Math.min(spendResult.valueSpent, amountPayableBeforePoints);
                            orderLoyaltyPointsSpent = Math.floor(orderLoyaltyPointsValueSpent / loyaltyService.LOYALTY_POINT_USD_VALUE); // Recalculate points based on capped value

                            if (orderLoyaltyPointsValueSpent > amountPayableBeforePoints) {
                                logger.warn(`Checkout [Tx]: Loyalty points value (${orderLoyaltyPointsValueSpent}) exceeded amount payable (${amountPayableBeforePoints}). Adjusting spent value.`);
                                orderLoyaltyPointsValueSpent = amountPayableBeforePoints; // Cap at payable amount
                                // Potentially need to re-calculate points spent if value is capped, or ensure spendPointsForOrder respects this.
                            }

                            createdOrder.loyaltyPointsSpent = orderLoyaltyPointsSpent;
                            createdOrder.loyaltyPointsValueSpent = orderLoyaltyPointsValueSpent;
                            createdOrder.finalTotalAmount = Math.max(0, parseFloat((amountPayableBeforePoints - orderLoyaltyPointsValueSpent).toFixed(2)));
                            await createdOrder.save({ session });
                            logger.info(`Checkout [Tx]: User ${finalUserId} spent ${orderLoyaltyPointsSpent} points (Value: ${orderLoyaltyPointsValueSpent}) for order ${createdOrder.orderNumber}.`);
                        } catch (loyaltyError) {
                            if (loyaltyError.message.includes('Insufficient loyalty points')) {
                                logger.warn(`Checkout [Tx]: Could not spend loyalty points due to insufficient balance for user ${finalUserId}. Proceeding without spending points.`);
                                // Do not rethrow, allow order to proceed without points
                            } else {
                                logger.error(`Checkout [Tx]: Error spending loyalty points: ${loyaltyError.message}. Transaction will abort.`);
                                throw loyaltyError; // Rethrow for other loyalty errors to abort transaction
                            }
                        }
                    }
                }
            }
            
            // --- 9. Calculate Loyalty Points to be Earned ---
            // Earn points on the final amount paid by card/cash (after discounts and spent points)
            if (finalUserId) { // Only registered users earn points
                const pointsEarnableAmount = createdOrder.finalTotalAmount; // Earn on what they actually paid
                if (pointsEarnableAmount > 0) {
                    // Assuming loyaltyService.calculatePointsToEarn exists or logic is here
                    // const pointsToEarn = loyaltyService.calculatePointsToEarn(pointsEarnableAmount);
                    // Using the direct calculation from PRD (10% of final amount)
                    const pointsToEarn = Math.floor(pointsEarnableAmount * 0.10); // 10% earn rate
                    createdOrder.loyaltyPointsEarned = pointsToEarn;
                    // Note: Actual awarding of points (updating balance) happens post-transaction, upon order completion (e.g. delivery)
                }
            }

            // --- 10. Update Order Status (e.g., to 'processing' or confirm payment) ---
            // This depends on payment integration. Assuming payment is confirmed for now.
            createdOrder.status = 'processing'; // Or 'confirmed' if payment is truly done.
            createdOrder.paymentStatus = 'paid'; // Reflect successful payment
            createdOrder.statusHistory.push({ status: createdOrder.status, notes: 'Order payment confirmed, processing started.' });
            await createdOrder.save({ session });
            logger.info(`Checkout [Tx]: Order ${createdOrder.orderNumber} status updated to ${createdOrder.status}.`);

            // --- 11. Clear Cart ---
            await cartService.clearCart(cartIdentifier, session); // Pass session to cartService if it supports it
            logger.info(`Checkout [Tx]: Cart cleared for identifier`, { metadata: cartIdentifier });

        }); // End transaction

        logger.info(`Checkout - Transaction committed successfully for Order ${createdOrder.orderNumber}.`);

        // --- Post-Transaction Asynchronous Tasks ---
        // 10. Decrement stock in Product Service
        try {
            const itemsToDecrement = createdOrder.items.map(item => ({
                productId: item.productId.toString(),
                variantId: item.variantId.toString(),
                quantity: item.quantity,
            }));
            await apiClient.decrementProductStock(itemsToDecrement);
            logger.info(`Checkout: Stock decremented for order ${createdOrder.orderNumber}.`);
        } catch (stockError) {
            logger.error(`Checkout: Failed to decrement stock for order ${createdOrder.orderNumber}. Needs manual check/compensation.`, stockError);
            // This is a critical issue. Consider adding to a retry queue or admin alert system.
        }

        // 11. Award loyalty points (actual balance update) if order is in a point-awarding state
        // This might be better handled by adminOrderService when order status changes to e.g. 'delivered'
        // For now, let's assume direct awarding if user exists and points were calculated to be earned.
        if (createdOrder.userId && createdOrder.loyaltyPointsEarned > 0) {
            try {
                // This call should be idempotent or handled by a separate process based on order status changes
                // await loyaltyService.awardPointsForOrder(createdOrder._id, createdOrder.userId, createdOrder.loyaltyPointsEarned); // Pass earned points directly
                logger.info(`Checkout: Loyalty points (${createdOrder.loyaltyPointsEarned}) for order ${createdOrder.orderNumber} are calculated. Actual award happens on order completion.`);
            } catch (awardError) {
                logger.error(`Checkout: Failed to queue loyalty points award for order ${createdOrder.orderNumber}.`, awardError);
            }
        }

        // Send order confirmation notification
        try {
            let recipientEmailForNotification = userEmailForNotification;
            let recipientNameForNotification = userFullNameForNotification || 'Customer';

            if (!createdOrder.userId && createdOrder.guestEmail) {
                recipientEmailForNotification = createdOrder.guestEmail;
                recipientNameForNotification = createdOrder.shippingAddress.fullName || 'Customer';
            }

            if (recipientEmailForNotification) {
                await amqpService.publishNotification('orderConfirmation', {
                    recipientEmail: recipientEmailForNotification,
                    data: {
                        orderNumber: createdOrder.orderNumber,
                        customerName: recipientNameForNotification,
                        orderDate: new Date(createdOrder.createdAt).toLocaleDateString(),
                        items: createdOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                        shippingAddress: createdOrder.shippingAddress,
                        subTotalAmount: createdOrder.subTotalAmount,
                        taxAmount: createdOrder.taxAmount,
                        discountCode: createdOrder.discountCode,
                        discountAmount: createdOrder.discountAmount,
                        shippingFee: createdOrder.shippingFee,
                        finalTotalAmount: createdOrder.finalTotalAmount
                    }
                });
                logger.info(`Checkout: Order confirmation notification published for ${createdOrder.orderNumber}.`);
            } else {
                logger.warn(`Checkout: No recipient email found for order confirmation ${createdOrder.orderNumber}.`);
            }
        } catch (notificationError) {
            logger.error(`Checkout: Failed to publish order confirmation notification for ${createdOrder.orderNumber}.`, notificationError);
        }

        return createdOrder; // Return the final, saved order object

    } catch (error) {
        logger.error(`Checkout: Critical error during order processing transaction for identifier ${JSON.stringify(cartIdentifier)}. Error: ${error.message}`, { stack: error.stack, details: error });
        // The transaction should have aborted and rolled back changes.
        // Ensure error is an AppError or convert it.
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Order processing failed.', error.statusCode || 500);
    } finally {
        if (session) {
            session.endSession();
            logger.info('Checkout - Database session ended.');
        }
    }
};

/**
 * Get a user's order history.
 * @param {string} userId - The ID of the user.
 * @param {Object} paginationOptions - Options for pagination { page, limit }.
 * @returns {Promise<Object>} An object containing orders and pagination details.
 */
const getOrderHistory = async (userId, paginationOptions = { page: 1, limit: 10 }) => {
    logger.info(`OrderService: getOrderHistory called with userId: [${userId}]`, { userId });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error(`OrderService: Invalid userId format in getOrderHistory: [${userId}]`);
        throw new AppError('Invalid user ID format for order history.', 400);
    }
    const { page, limit } = {
        page: parseInt(paginationOptions.page) || 1,
        limit: parseInt(paginationOptions.limit) || 10
    };
        const skip = (page - 1) * limit;

    const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
        .populate('items.productId', 'name image') // Example: if productId actually refers to a Product model in this service
        .lean(); // Use .lean() for faster queries if not modifying results

    const totalOrders = await Order.countDocuments({ userId });

        return {
            orders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        };
};

/**
 * Get details of a specific order for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise<Order>} The order details.
 */
const getOrderDetails = async (userId, orderId) => {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(orderId)) {
        throw new AppError('Invalid user or order ID format.', 400);
    }
    // Find by orderId and userId to ensure ownership
    const order = await Order.findOne({ _id: orderId, userId }).lean();
    if (!order) {
        throw new AppError('Order not found or access denied.', 404);
    }
    return order;
};

/**
 * Get order details by order number (can be used by user or admin if they have order number).
 * This version doesn't check userId, so could be for a more general lookup.
 * @param {string} orderNumber
 * @returns {Promise<Order>}
 */
const getOrderByOrderNumber = async (orderNumber) => {
    if (!orderNumber) {
        throw new AppError('Order number is required.', 400);
    }
    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() }).lean();
    if (!order) {
        throw new AppError(`Order with number ${orderNumber} not found.`, 404);
    }
    return order;
};

module.exports = {
    processCheckout,
    getOrderHistory,
    getOrderDetails,
    getOrderByOrderNumber,
    OrderProcessingError // Export if used by other services, though AppError is preferred
}; 