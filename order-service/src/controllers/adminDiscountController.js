const adminDiscountService = require('../services/adminDiscountService');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// @desc    Create a new discount code
// @route   POST /api/admin/discounts
// @access  Admin
// Note: Validation middleware runs before this
const createDiscount = async (req, res, next) => {
    try {
        const discountData = req.body;
        // Basic checks, Joi/service layer handles more detailed validation
        if (!discountData.code || !discountData.discountType || discountData.value === undefined) {
            return next(new AppError('Discount code, type, and value are required.', 400));
        }
        const discount = await adminDiscountService.createDiscount(discountData);
        res.status(201).json({
            status: 'success',
            data: { discount },
        });
    } catch (error) {
        logger.error('AdminDiscountController: Error in createDiscount', { metadata: { error: error.message, stack: error.stack, body: req.body } });
        next(error);
    }
};

// @desc    Get all discount codes
// @route   GET /api/admin/discounts
// @access  Admin
// Note: Add pagination validation if desired
const getAllDiscounts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const discountsData = await adminDiscountService.getAllDiscounts({ page, limit });
        res.status(200).json({
            status: 'success',
            data: discountsData, // Contains discounts, currentPage, totalPages, totalDiscounts
        });
    } catch (error) {
        logger.error('AdminDiscountController: Error in getAllDiscounts', { metadata: { error: error.message, stack: error.stack, query: req.query } });
        next(error);
    }
};

// @desc    Get a specific discount by ID
// @route   GET /api/admin/discounts/:id
// @access  Admin
const getDiscountById = async (req, res, next) => {
    try {
        const { discountId } = req.params;
        const discount = await adminDiscountService.getDiscountById(discountId);
        res.status(200).json({
            status: 'success',
            data: { discount },
        });
    } catch (error) {
        logger.error('AdminDiscountController: Error in getDiscountById', { metadata: { error: error.message, stack: error.stack, params: req.params } });
        next(error);
    }
};

// @desc    Update a discount
// @route   PUT /api/admin/discounts/:id
// @access  Admin
const updateDiscount = async (req, res, next) => {
    try {
        const { discountId } = req.params;
        const updateData = req.body;
        if (Object.keys(updateData).length === 0) {
             return next(new AppError('No update data provided.', 400));
        }
        const discount = await adminDiscountService.updateDiscount(discountId, updateData);
        res.status(200).json({
            status: 'success',
            data: { discount },
        });
    } catch (error) {
        logger.error('AdminDiscountController: Error in updateDiscount', { metadata: { error: error.message, stack: error.stack, params: req.params, body: req.body } });
        next(error);
    }
};

// @desc    Delete a discount (Placeholder if route is enabled)
// @route   DELETE /api/admin/discounts/:id
// @access  Admin
const deleteDiscount = async (req, res, next) => {
    try {
        const { discountId } = req.params;
        const result = await adminDiscountService.deleteDiscount(discountId);
        res.status(200).json({ // Or 204 No Content if preferred
            status: 'success',
            message: result.message,
        });
    } catch (error) {
        logger.error('AdminDiscountController: Error in deleteDiscount', { metadata: { error: error.message, stack: error.stack, params: req.params } });
        next(error);
    }
};

module.exports = {
    createDiscount,
    getAllDiscounts,
    getDiscountById,
    updateDiscount,
    deleteDiscount,
}; 