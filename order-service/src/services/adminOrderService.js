const Order = require('../models/Order');
const mongoose = require('mongoose');
const loyaltyService = require('./loyaltyService');
const amqpService = require('./amqpService'); // For notifications
const apiClient = require('../utils/apiClient'); // To get user email for notifications
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * (Admin) Get a list of all orders with pagination and filtering.
 * @param {object} filters - { status, dateFrom, dateTo, userId, orderNumber, sortBy, sortOrder }
 * @param {object} paginationOptions - { page, limit }
 * @returns {Promise<object>} Paginated list of all orders.
 */
const getAllOrders = async (filters = {}, paginationOptions = { page: 1, limit: 20 }) => {
    const { status, dateFrom, dateTo, userId, orderNumber, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const { page, limit } = {
        page: parseInt(paginationOptions.page) || 1,
        limit: parseInt(paginationOptions.limit) || 20,
    };
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
        if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid userId filter format.', 400);
        query.userId = userId;
        }
    if (orderNumber) query.orderNumber = { $regex: orderNumber, $options: 'i' }; // Case-insensitive search

        if (dateFrom || dateTo) {
            query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999)); // End of day
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    try {
        const orders = await Order.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            // .populate('userId', 'email fullName') // Optionally populate user details
            .lean(); 

        const totalOrders = await Order.countDocuments(query);

        logger.info(`Admin: Fetched ${orders.length} orders of ${totalOrders} total.`);
        return {
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
        };
    } catch (error) {
        logger.error('Admin: Error fetching all orders:', error);
        throw new AppError('Failed to retrieve orders.', 500);
    }
};

/**
 * (Admin) Get full details of a specific order.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise<Order>} The order details.
 */
const getOrderDetailsAsAdmin = async (orderId) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new AppError('Invalid order ID format.', 400);
    }
    const order = await Order.findById(orderId)
        // .populate('userId', 'email fullName addresses') // Populate more user details for admin view
        // .populate('discountId') // Populate discount details
        .lean();

    if (!order) {
        throw new AppError('Order not found.', 404);
    }
    logger.info(`Admin: Fetched details for order ${orderId}.`);
    return order;
};

/**
 * (Admin) Update the status of an order.
 * If status changes to 'delivered', award loyalty points.
 * Sends notification on status change.
 * @param {string} orderId - The ID of the order.
 * @param {string} newStatus - The new status for the order.
 * @param {string} adminNotes - Optional notes from the admin.
 * @param {string} adminUserId - ID of the admin performing the change (for audit).
 * @returns {Promise<Order>} The updated order.
 */
const updateOrderStatus = async (orderId, newStatus, adminNotes = '', adminUserId = 'System') => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new AppError('Invalid order ID format.', 400);
    }
    const validStatuses = Order.schema.path('status').enumValues;
    if (!validStatuses.includes(newStatus)) {
        throw new AppError(`Invalid order status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}.`, 400);
    }

    const session = await mongoose.startSession();
    let updatedOrder = null;
    let pointsAwardedResult = null;
    let pointsReversedResult = null;

    try {
        await session.withTransaction(async () => {
            const order = await Order.findById(orderId).session(session);
        if (!order) {
                throw new AppError('Order not found.', 404);
            }

            const oldStatus = order.status;
            if (oldStatus === newStatus) {
                logger.info(`Admin [Tx]: Order ${orderId} status is already ${newStatus}. No update performed.`);
                updatedOrder = order; // Assign order to return it later
                // Abort transaction explicitly if needed, or let it commit with no changes
                // For clarity, maybe throw a specific error or just return?
                // Let's just set updatedOrder and allow transaction to commit (idempotent)
                return; // Exit the transaction block
        }

        order.status = newStatus;
            const historyNote = adminNotes || `Status updated to ${newStatus} by admin ${adminUserId}`;
            order.statusHistory.push({ status: newStatus, notes: historyNote });

            // --- Handle Loyalty Points --- 
            const wasOrderCompleted = ['delivered', 'completed'].includes(oldStatus); // Define completed states
            const isOrderNowCompleted = ['delivered', 'completed'].includes(newStatus);
            const isOrderNowCancelled = ['cancelled', 'refunded'].includes(newStatus);

            if (order.userId && order.finalTotalAmount >= 0) { // Only handle points for users and non-negative totals
                // 1. Award points if moving to a completed state (and not already completed)
                if (isOrderNowCompleted && !wasOrderCompleted) {
                    try {
                        pointsAwardedResult = await loyaltyService.awardPointsForOrder(
                            order._id,
                            order.userId,
                            order.finalTotalAmount, // Award based on final amount
                            session
                        );
                        order.loyaltyPointsEarned = pointsAwardedResult.pointsAwarded;
                        logger.info(`Admin [Tx]: Awarded ${pointsAwardedResult.pointsAwarded} loyalty points for order ${orderId} upon completion.`);
                    } catch (loyaltyError) {
                        logger.error(`Admin [Tx]: Failed to award loyalty points for order ${orderId}: ${loyaltyError.message}. Continuing status update.`);
                        // Decide if this should abort transaction. Let's assume points award failure is not critical enough to stop status change.
                    }
                }
                // 2. Reverse points if moving to a cancelled/refunded state (from any previous state)
                else if (isOrderNowCancelled) {
                     try {
                        pointsReversedResult = await loyaltyService.reversePointsForOrder(
                            order._id,
                            `Order status set to ${newStatus}`, // Reason
                            session
                        );
                        // Optionally, clear the earned points field on the order itself
                        if (pointsReversedResult && pointsReversedResult.reversedEarned > 0) {
                             order.loyaltyPointsEarned = 0; // Reset earned points on order if reversal happened
                        }
                        logger.info(`Admin [Tx]: Loyalty points reversal processed for order ${orderId} due to status ${newStatus}. Reversed Earned: ${pointsReversedResult?.reversedEarned}, Reversed Spent: ${pointsReversedResult?.reversedSpent}`);
                     } catch (loyaltyError) {
                         logger.error(`Admin [Tx]: Failed to reverse loyalty points for cancelled/refunded order ${orderId}: ${loyaltyError.message}. Continuing status update.`);
                         // Points reversal failure might be more critical - consider if transaction should abort.
                     }
                }
            }

            updatedOrder = await order.save({ session });
        }); // End transaction

        if (!updatedOrder) { // Handle the case where status was already the newStatus
             const order = await Order.findById(orderId).lean(); // Fetch fresh data outside transaction
             return order; // Return current order state
        }

        logger.info(`Admin: Successfully updated status for order ${orderId} to ${newStatus}. Transaction committed.`);

        // --- Post-Transaction Asynchronous Tasks ---
        try {
            let recipientEmail = null;
            let userName = 'Customer';
            const orderForNotification = updatedOrder.toObject(); // Use plain object

            if (orderForNotification.userId) {
                const userData = await apiClient.getUserData(orderForNotification.userId.toString(), null);
                if (userData) {
                    recipientEmail = userData.email;
                    userName = userData.fullName || userName;
                }
            } else if (orderForNotification.guestEmail) { // Use guest email stored on order
                recipientEmail = orderForNotification.guestEmail;
                userName = orderForNotification.shippingAddress?.fullName || 'Customer';
            }

            if (!recipientEmail) {
                 logger.warn(`Admin: Could not determine recipient email for order ${orderId} status update notification.`);
            } else {
                // Send order status update notification
                await amqpService.publishNotification('orderStatusUpdate', {
                    recipientEmail,
                    data: {
                        orderNumber: orderForNotification.orderNumber,
                        userName,
                        newStatus: orderForNotification.status,
                        statusUpdateDate: new Date().toLocaleDateString(),
                        notes: adminNotes || `Your order status has been updated to ${orderForNotification.status}.`,
                    }
                });
                logger.info(`Admin: Order status update notification published for order ${orderId} to ${recipientEmail}.`);

                // Send loyalty points update notification if points were awarded or reversed
                let pointsNotificationType = null;
                let pointsNotificationData = null;

                if (pointsAwardedResult && pointsAwardedResult.pointsAwarded > 0) {
                    pointsNotificationType = 'loyaltyPointsUpdate';
                    pointsNotificationData = {
                        userName,
                        pointsChange: pointsAwardedResult.pointsAwarded,
                        newBalance: pointsAwardedResult.account.balance,
                        transactionType: 'earned',
                        orderNumber: orderForNotification.orderNumber,
                        updateDate: new Date().toLocaleDateString(),
                    };
                } else if (pointsReversedResult && (pointsReversedResult.reversedEarned > 0 || pointsReversedResult.reversedSpent > 0)) {
                    // Need current balance after reversal for notification
                    const currentBalance = await loyaltyService.getLoyaltyBalance(orderForNotification.userId.toString());
                    pointsNotificationType = 'loyaltyPointsUpdate'; // Use same notification type? Or specific 'reversal' type?
                    pointsNotificationData = {
                        userName,
                        // Summarize the change, or send details?
                        pointsChange: pointsReversedResult.reversedSpent - pointsReversedResult.reversedEarned, // Net change
                        newBalance: currentBalance,
                        transactionType: 'reversal',
                        orderNumber: orderForNotification.orderNumber,
                        updateDate: new Date().toLocaleDateString(),
                        reason: `Order ${orderForNotification.status}`,
                    };
                }

                if (pointsNotificationType && pointsNotificationData) {
                    await amqpService.publishNotification(pointsNotificationType, {
                        recipientEmail,
                        data: pointsNotificationData
                    });
                    logger.info(`Admin: Loyalty points update notification (${pointsNotificationType}) published for order ${orderId} to ${recipientEmail}.`);
                }
            }
        } catch (notificationError) {
            logger.error(`Admin: Failed to publish notification(s) for order ${orderId} status update: ${notificationError.message}.`);
        }

        return updatedOrder.toObject();

    } catch (error) {
        logger.error(`Admin: Failed transaction for order status update ${orderId}:`, error);
        // No need to manually abort if using withTransaction
        if (error instanceof AppError) throw error;
        throw new AppError(error.message || 'Failed to update order status.', 500);
    } finally {
        if (session) {
            session.endSession();
            logger.info(`Admin: Database session ended for order status update ${orderId}.`);
        }
    }
};


module.exports = {
    getAllOrders,
    getOrderDetailsAsAdmin,
    updateOrderStatus,
}; 