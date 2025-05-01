const adminOrderService = require('../services/adminOrderService');
const asyncHandler = require('../middleware/asyncHandler'); // Use asyncHandler

// @desc    List all orders (Admin)
// @route   GET /api/admin/orders
// @access  Admin
// Note: Validation middleware for query params runs before this
const listOrders = asyncHandler(async (req, res) => {
    // Query params are already validated by middleware
    const filters = { ...req.query };
    const pagination = { page: filters.page, limit: filters.limit };
    delete filters.page;
    delete filters.limit;

    // Convert date strings to Date objects if they exist
    if (filters.startDate) filters.startDate = new Date(filters.startDate);
    if (filters.endDate) filters.endDate = new Date(filters.endDate);

    const result = await adminOrderService.listAllOrders(filters, pagination);
    res.status(200).json(result);
});

// @desc    Get specific order details by ID (Admin access)
// @route   GET /api/admin/orders/:id
// @access  Admin
// Note: Validation middleware for params.id runs before this
const getOrderDetails = asyncHandler(async (req, res) => {
    const orderId = req.params.id; // Already validated
    const order = await adminOrderService.getOrderDetailsById(orderId);
    res.status(200).json(order); // Service should throw error if not found
});

// @desc    Update order status (Admin)
// @route   PUT /api/admin/orders/:id/status
// @access  Admin
// Note: Validation middleware for params.id and body runs before this
const updateOrderStatus = asyncHandler(async (req, res) => {
    const orderId = req.params.id; // Already validated
    const { status } = req.body; // Already validated

    const updatedOrder = await adminOrderService.updateOrderStatus(orderId, status);
    res.status(200).json(updatedOrder); // Service should throw error if not found
});

module.exports = {
    listOrders,
    getOrderDetails,
    updateOrderStatus,
}; 