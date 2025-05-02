const Order = require('../models/Order');
const Discount = require('../models/Discount');
const {
    getAuthServiceClient,
    getProductServiceClient,
    getNotificationServiceClient,
    deductUserLoyaltyPoints,
    updateUserLoyaltyPoints,
    sendOrderConfirmationNotification
} = require('../utils/apiClient');
const { calculateTaxAmount } = require('../utils/calculations'); // Assuming this utility exists
const mongoose = require('mongoose'); // Ensure mongoose is imported
// const User = require('../models/User'); // If User model is managed here, otherwise via API
// const productApi = require('../utils/productApi'); // Placeholder for Product service client
// const authApi = require('../utils/authApi'); // Placeholder for Auth service client
// const notificationQueue = require('../utils/notificationQueue'); // Placeholder for notification queue

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
    console.log(`Checkout initiated by ${userId || guestData?.email || 'Unknown'}`);

    let finalUserId = userId;
    let user = null; // To store fetched user data if needed

    // --- API Clients (created here to potentially include authToken) ---
    const authApiClient = getAuthServiceClient(authToken);
    const productApiClient = getProductServiceClient(authToken); // Auth might not be needed for product fetching
    const notificationApiClient = getNotificationServiceClient(); // No auth needed typically

    // 1. Handle Guest vs. Logged-in User
    if (!finalUserId) {
        if (!guestData || !guestData.email || !guestData.fullName) {
            throw new OrderProcessingError('Guest email and fullName are required for guest checkout.', 400);
        }
        console.log('Guest checkout: Finding or creating user...');
        try {
            // ASSUMPTION: Auth service has POST /api/users/find-or-create-guest
            const response = await authApiClient.post('/api/users/find-or-create-guest', guestData);
            finalUserId = response.data.userId; // ASSUMPTION: Response format { userId: '...' }
            console.log(`Using User ID for guest: ${finalUserId}`);
            if (pointsToUse > 0) {
                throw new OrderProcessingError('Guests cannot use loyalty points.', 400);
            }
        } catch (error) {
            console.error('Error finding/creating guest user:', error.response?.data || error.message);
            throw new OrderProcessingError('Failed to process guest user information.', 502); // 502 Bad Gateway
        }
    }

    // 2. Fetch User Details (Cart, Address, Points) for Logged-in User
    let cartItems = [];
    let shippingAddress = null;
    let availablePoints = 0;
    if (finalUserId) { // Fetch details for both logged-in and newly created guests if needed
        try {
            console.log(`Fetching details for user ${finalUserId}...`);
            // ASSUMPTION: Auth service has GET /api/users/me/checkout-details?addressId=:addressId
            // This combines fetching user, their cart, specific address, and points in one call
            const response = await authApiClient.get(`/api/users/me/checkout-details?addressId=${addressId}`);
            user = response.data.user; // ASSUMPTION: Response structure
            cartItems = response.data.cart;
            shippingAddress = response.data.address;
            availablePoints = response.data.loyaltyPoints;

            if (!cartItems || cartItems.length === 0) {
                throw new OrderProcessingError('Cannot checkout with an empty cart.', 400);
            }
            if (!shippingAddress) {
                throw new OrderProcessingError('Selected shipping address not found.', 404);
            }
            console.log(`Fetched cart (${cartItems.length} items), address, and points (${availablePoints}) for user ${finalUserId}.`);
        } catch (error) {
            console.error(`Error fetching user details for ${finalUserId}:`, error.response?.data || error.message);
            if (error.response?.status === 404) {
                 throw new OrderProcessingError('Cart, address, or user data not found.', 404);
            }
            throw new OrderProcessingError('Failed to retrieve user cart or address information.', 502);
        }
    }

    // 3. Fetch Product Details (Price, Stock, Name, Image)
    let validatedItems = [];
    try {
        console.log('Fetching product details from Product Service...');
        const itemIds = cartItems.map(item => ({ productId: item.productId, variantId: item.variantId }));
        // ASSUMPTION: Product service has POST /api/products/validate-stock
        // Takes array [{ productId, variantId, quantity }] and returns validated items with price, stock, name, image
        const payload = cartItems.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }));
        const response = await productApiClient.post('/api/products/validate-stock', { items: payload });
        validatedItems = response.data.validatedItems; // ASSUMPTION: Response structure
        console.log('Items validated and details fetched from Product Service.');
    } catch (error) {
        console.error('Error validating items with Product Service:', error.response?.data || error.message);
        if (error.response?.status === 400) {
            throw new OrderProcessingError(`Product validation failed: ${error.response.data.message || 'Out of stock or invalid item.'}`, 400);
        }
        throw new OrderProcessingError('Failed to validate products with Product Service.', 502);
    }

    // 4. Calculate Initial Totals
    let totalAmount = 0;
    const orderItems = validatedItems.map(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        return {
            productId: item.productId,
            variantId: item.variantId,
            name: item.name, // Name from product service
            variantName: item.variantName, // Variant name from product service
            image: item.image, // Image from product service
            quantity: item.quantity,
            price: item.price, // Price from product service
        };
    });
    console.log(`Calculated initial totalAmount: ${totalAmount}`);

    // 5. Validate and Apply Discount Code
    let discount = null;
    let discountAmount = 0;
    if (discountCode) {
        try {
            discount = await Discount.findOne({ code: discountCode });
            if (!discount) {
                throw new OrderProcessingError('Invalid discount code.', 404);
            }
            if (discount.usedCount >= discount.maxUsage) {
                throw new OrderProcessingError('Discount code has reached its maximum usage limit.', 400);
            }
            // Applying discount on totalAmount before tax/shipping
            discountAmount = (totalAmount * discount.value) / 100;
            console.log(`Applied discount code ${discountCode}: ${discountAmount}`);
        } catch (err) {
            if (err instanceof OrderProcessingError) throw err;
            console.error(`Error applying discount ${discountCode}:`, err);
            throw new OrderProcessingError('Error validating discount code.', 500);
        }
    }

    // 6. Validate and Apply Loyalty Points
    let actualPointsUsed = 0;
    let pointsValueUsed = 0;
    if (finalUserId && pointsToUse > 0) {
        console.log(`Attempting to use ${pointsToUse} loyalty points. Available: ${availablePoints}`);
        if (pointsToUse > availablePoints) {
            throw new OrderProcessingError(`Insufficient loyalty points. Available: ${availablePoints}`, 400);
        }

        // Assuming 1 point = 1 unit of currency
        const pointValue = 1;
        const maxPointsValueApplicable = totalAmount - discountAmount;

        if (pointsToUse * pointValue > maxPointsValueApplicable) {
            actualPointsUsed = Math.floor(maxPointsValueApplicable / pointValue);
            console.warn(`Requested points (${pointsToUse}) exceed applicable amount. Using ${actualPointsUsed} points instead.`);
        } else {
            actualPointsUsed = pointsToUse;
        }

        if (actualPointsUsed > 0) {
            pointsValueUsed = actualPointsUsed * pointValue;
            console.log(`Applying ${actualPointsUsed} loyalty points, value: ${pointsValueUsed}`);
        }
    }

    // 7. Calculate Final Amounts
    const amountAfterDiscount = totalAmount - discountAmount;
    const taxRate = 8; // TODO: Make configurable
    const taxAmount = calculateTaxAmount(amountAfterDiscount, taxRate);
    const shippingFee = 0; // TODO: Implement shipping calculation

    const totalBeforePoints = amountAfterDiscount + taxAmount + shippingFee;

    if (pointsValueUsed > totalBeforePoints) {
        console.warn(`Points value (${pointsValueUsed}) exceeds total before points (${totalBeforePoints}). Adjusting points used.`);
        pointsValueUsed = totalBeforePoints;
        const pointValue = 1;
        actualPointsUsed = Math.floor(pointsValueUsed / pointValue);
    }

    const finalTotalAmount = totalBeforePoints - pointsValueUsed;
    console.log(`Tax: ${taxAmount}, Shipping: ${shippingFee}, Points Value Used: ${pointsValueUsed}, Final Total: ${finalTotalAmount}`);

    // 8. Calculate Loyalty Points Earned
    const loyaltyPointsEarned = finalUserId ? Math.floor(finalTotalAmount * 0.10) : 0;
    console.log(`Loyalty points earned: ${loyaltyPointsEarned}`);

    // 9. Create Order Object
    const newOrderData = {
        userId: finalUserId,
        items: orderItems,
        totalAmount,
        discountId: discount ? discount._id : null,
        discountCode: discount ? discount.code : null,
        discountAmount,
        tax: taxRate,
        shippingFee,
        pointsUsed: actualPointsUsed,
        finalTotalAmount,
        address: shippingAddress, // Address fetched from Auth Service
        status: 'pending',
        statusHistory: [{ status: 'pending', updatedAt: new Date() }],
        loyaltyPointsEarned,
    };

    const newOrder = new Order(newOrderData);
    let savedOrder = null;

    // --- Database Transaction --- Start Session
    const session = await mongoose.startSession();
    session.startTransaction();
    console.log('Started database transaction.');

    try {
        // 10. Save Order within the transaction
        // Mongoose pre-save hook for statusHistory runs here
        savedOrder = await newOrder.save({ session });
        console.log(`Order ${savedOrder._id} saved within transaction.`);

        // 11. Increment Discount Usage Count within the transaction (if applicable)
        if (discount) {
            // We need to use findOneAndUpdate or similar with the session
            // Using discount.save() might not work reliably within a transaction from a previously fetched doc
            const updatedDiscount = await Discount.findOneAndUpdate(
                { _id: discount._id, usedCount: { $lt: discount.maxUsage } }, // Condition to prevent race condition
                { $inc: { usedCount: 1 } },
                { session, new: true } // Get the updated doc back
            );
            if (!updatedDiscount) {
                 // This means the discount was used up between findOne and here
                 throw new OrderProcessingError(`Discount code ${discountCode} usage limit reached concurrently.`, 409);
            }
            console.log(`Incremented usage count for discount ${discount.code} within transaction.`);
        }

        // Commit the transaction if all DB operations succeed
        await session.commitTransaction();
        console.log('Database transaction committed.');

    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        console.error('Database transaction aborted:', error);
        // Re-throw specific errors or a generic one
        if (error instanceof OrderProcessingError) throw error;
        if (error.code === 11000) { // Handle potential duplicate key errors during save
             throw new OrderProcessingError('Failed to save order due to duplicate key.', 409);
        }
        throw new OrderProcessingError('Failed to save order data during transaction.', 500);
    } finally {
        // End the session
        await session.endSession();
        console.log('Database session ended.');
    }

    // --- Post-Order Creation Steps (Run outside transaction) ---
    // Use the savedOrder object which is confirmed to exist
    const postOrderTasks = [];

    // 12. Decrement Stock via Product Service
    postOrderTasks.push(
        productApiClient.post('/api/products/decrement-stock', { items: savedOrder.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) })
            .then(() => console.log(`Stock decrement request sent for order ${savedOrder._id}.`))
            .catch(err => console.error(`CRITICAL: Failed to decrement stock for order ${savedOrder._id}:`, err.response?.data || err.message)) // Log as critical
    );

    // 13. Update Loyalty Points via Auth Service (Deduct used, Add earned)
    // Use separate calls for deduct and add
    if (finalUserId && savedOrder.pointsUsed > 0) {
        postOrderTasks.push(
            deductUserLoyaltyPoints(finalUserId, savedOrder.pointsUsed, authToken)
                .then(() => console.log(`Loyalty points deduction request sent for user ${finalUserId} (${savedOrder.pointsUsed} points).`))
                .catch(err => console.error(`CRITICAL: Failed to deduct loyalty points for user ${finalUserId} (Order ${savedOrder._id}):`, err.message)) // Log as critical
        );
    }
    if (finalUserId && savedOrder.loyaltyPointsEarned > 0) {
        postOrderTasks.push(
            updateUserLoyaltyPoints(finalUserId, savedOrder.loyaltyPointsEarned, authToken)
                .then(() => console.log(`Loyalty points addition request sent for user ${finalUserId} (${savedOrder.loyaltyPointsEarned} points).`))
                .catch(err => console.error(`CRITICAL: Failed to add loyalty points for user ${finalUserId} (Order ${savedOrder._id}):`, err.message)) // Log as critical
        );
    }

    // 14. Send Order Confirmation Notification
    // Construct the payload expected by the notification service plan
    const notificationPayload = {
        recipientEmail: user?.email || guestData?.email, // Get email from fetched user or guest data
        // Send the full saved order data
        orderData: savedOrder.toObject ? savedOrder.toObject() : savedOrder, // Convert Mongoose doc if necessary
        // Send basic user data
        userData: {
            fullName: user?.fullName || guestData?.fullName,
            email: user?.email || guestData?.email
        }
    };

    if (notificationPayload.recipientEmail) {
        postOrderTasks.push(
            // Call the specific function from apiClient which has the correct endpoint
            sendOrderConfirmationNotification(notificationPayload)
                .then(() => console.log(`Order confirmation notification request sent for order ${savedOrder._id}.`))
                .catch(err => console.error(`Failed to send notification for order ${savedOrder._id}:`, err.message)) // Log, not critical
        );
    } else {
        console.warn(`Cannot send notification for order ${savedOrder._id}: User email not available.`);
    }

    // Wait for all non-critical post-order tasks (logging errors, not failing checkout)
    await Promise.allSettled(postOrderTasks);

    return savedOrder; // Return the confirmed saved order
};

/**
 * Retrieves order history for a specific user.
 */
const getOrderHistory = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required to fetch order history.');
    }
    // Add pagination later if needed
    const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
    return orders;
};

/**
 * Retrieves a specific order by its ID, ensuring it belongs to the requesting user.
 */
const getOrderById = async (orderId, userId) => {
    if (!userId) {
        throw new Error('User ID is required to fetch order details.');
    }
    const order = await Order.findOne({ _id: orderId, userId: userId });

    if (!order) {
        // Use the custom error class
        throw new OrderProcessingError('Order not found or access denied.', 404);
    }
    return order;
};

module.exports = {
    processCheckout,
    getOrderHistory,
    getOrderById,
    OrderProcessingError // Export the custom error
}; 