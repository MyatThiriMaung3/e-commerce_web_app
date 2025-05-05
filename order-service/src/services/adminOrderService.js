const Order = require('../models/Order');

/**
 * Lists all orders with optional filtering and pagination.
 * @param {object} filters - Filtering criteria (e.g., { dateFrom, dateTo }).
 * @param {object} pagination - Pagination options (e.g., { page, limit }).
 * @returns {Promise<object>} - An object containing orders array and pagination info.
 */
const listAllOrders = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    try {
        const { dateFrom, dateTo } = filters;
        const { page, limit } = pagination;

        let query = {};
        // Apply date filters if provided
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                query.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Adjust dateTo to include the whole day
                let endDate = new Date(dateTo);
                // Standardize to UTC end of day for consistency
                endDate.setUTCHours(23, 59, 59, 999);
                query.createdAt.$lte = endDate;
            }
        }

        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(limit);
            // Consider populating userId if admin needs user details briefly
            // .populate('userId', 'email fullName');

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        return {
            orders,
            currentPage: page,
            totalPages,
            totalOrders
        };

    } catch (error) {
        console.error('Error listing all orders:', error.message);
        throw new Error('Could not retrieve orders.');
    }
};

/**
 * Updates the status of a specific order.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status ('pending', 'confirmed', 'shipping', 'delivered').
 * @returns {Promise<object|null>} - The updated order object, or null if not found.
 */
const updateOrderStatus = async (orderId, newStatus) => {
    try {
        // Define allowed statuses locally instead of relying on schema access in tests
        const allowedStatuses = ['pending', 'confirmed', 'shipping', 'delivered'];
        if (!allowedStatuses.includes(newStatus)) {
            console.error(`Attempted to set invalid status: ${newStatus} for order ${orderId}`);
            throw new Error(`Invalid status: ${newStatus}`);
        }

        console.log(`[Service Debug] Finding order: ${orderId}`); // <-- DEBUG LOG
        const order = await Order.findById(orderId);

        if (!order) {
            console.log(`[Service Debug] Order ${orderId} not found.`); // <-- DEBUG LOG
            return null; // Order not found
        }
        console.log(`[Service Debug] Found order ${orderId}. Current status: ${order.status}`); // <-- DEBUG LOG

        // Avoid redundant updates and pushing same status to history
        if (order.status === newStatus) {
            console.log(`[Service Debug] Status ${newStatus} is the same. No update needed.`); // <-- DEBUG LOG
            return order; // No change needed
        }

        // Update status and add to history
        console.log(`[Service Debug] Updating order ${orderId} status to: ${newStatus}`); // <-- DEBUG LOG
        order.status = newStatus;
        // Explicitly add the new status to the beginning of the history array
        order.statusHistory.unshift({ status: newStatus, updatedAt: new Date() });

        // Mark the array path as modified to ensure Mongoose persists the change
        order.markModified('statusHistory');

        console.log(`[Service Debug] Saving order ${orderId}...`); // <-- DEBUG LOG
        const updatedOrder = await order.save();
        console.log(`[Service Debug] Saved order ${orderId}. Result status: ${updatedOrder?.status}`); // <-- DEBUG LOG

        // TODO: Optionally, trigger a notification to the user about the status update
        // Example: await notificationQueue.sendStatusUpdate(updatedOrder);

        return updatedOrder;

    } catch (error) {
        console.error(`Error updating status for order ${orderId}:`, error.message);
        if (error.name === 'CastError') {
             return null; // Invalid orderId format
        }
        // If it's our specific invalid status error, re-throw it
        if (error.message.startsWith('Invalid status:')) {
            throw error;
        }
        // Otherwise, throw the generic error
        throw new Error('Could not update order status.');
    }
};

/**
 * Retrieves details for a specific order by its ID (Admin access).
 * @param {string} orderId - The ID of the order to retrieve.
 * @returns {Promise<object|null>} - The order object, or null if not found.
 * @throws {Error} - Throws error if there is a database issue.
 */
const getOrderDetailsById = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            // Handle not found case - controller might also check
            return null;
        }
        return order;
    } catch (error) {
        console.error(`Error fetching details for order ${orderId}:`, error.message);
        if (error.name === 'CastError') {
            // Invalid ObjectId format
            throw new Error('Invalid Order ID format');
        }
        throw new Error('Could not retrieve order details.');
    }
};

module.exports = {
    listAllOrders,
    updateOrderStatus,
    getOrderDetailsById
}; 