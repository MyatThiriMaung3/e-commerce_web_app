const Discount = require('../models/Discount');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * (Admin) Create a new discount code.
 * @param {object} discountData - { code, description, discountType, value, maxUsage, startDate, endDate, minPurchaseAmount, isActive }
 * @returns {Promise<Discount>} The created discount.
 */
const createDiscount = async (discountData) => {
    const { code, description, discountType, value, maxUsage, startDate, endDate, minPurchaseAmount, isActive } = discountData;

    // Basic validation for required fields, Mongoose schema will also validate
    if (!code || !discountType || value === undefined) {
        throw new AppError('Discount code, type, and value are required.', 400);
    }

    // Validate 5-character alphanumeric for code (as per PRD example, model allows more flexibility)
    // This is a soft validation here, model has stricter length etc.
    if (!/^[A-Z0-9]{3,}$/i.test(code)) { // Relaxed to 3+ for more general use, PRD suggests 5 char alpha-num
       // For stricter 5 char alphanumeric: /^[A-Z0-9]{5}$/i
       // logger.warn(`Discount code ${code} format warning. PRD example: 5-char alphanumeric.`);
    }

    try {
        const newDiscount = new Discount({
            code: code.toUpperCase(), // Ensure code is stored in uppercase
            description,
            discountType,
            value,
            maxUsage: maxUsage || 10, // Default from README_Orders_Notifications if not provided
            startDate,
            endDate, // PRD says no expiration, so this is optional
            minPurchaseAmount: minPurchaseAmount || 0,
            isActive: isActive !== undefined ? isActive : true,
        });

        const savedDiscount = await newDiscount.save();
        logger.info(`Admin: Discount code ${savedDiscount.code} created successfully.`);
        return savedDiscount;
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error for 'code'
            throw new AppError(`Discount code '${code.toUpperCase()}' already exists.`, 409);
        }
        logger.error('Admin: Error creating discount code:', error);
        if (error.name === 'ValidationError') {
            throw new AppError(`Validation Error: ${error.message}`, 400);
        }
        throw new AppError('Failed to create discount code.', 500);
    }
};

/**
 * (Admin) Get a list of all discount codes.
 * @param {object} paginationOptions - { page, limit }
 * @returns {Promise<object>} Paginated list of discounts.
 */
const getAllDiscounts = async (paginationOptions = { page: 1, limit: 10 }) => {
    const { page, limit } = {
        page: parseInt(paginationOptions.page) || 1,
        limit: parseInt(paginationOptions.limit) || 10,
    };
    const skip = (page - 1) * limit;

    try {
        const discounts = await Discount.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalDiscounts = await Discount.countDocuments();

        logger.info(`Admin: Fetched ${discounts.length} discounts of ${totalDiscounts} total.`);
        return {
            discounts,
            currentPage: page,
            totalPages: Math.ceil(totalDiscounts / limit),
            totalDiscounts,
        };
    } catch (error) {
        logger.error('Admin: Error fetching all discounts:', error);
        throw new AppError('Failed to retrieve discounts.', 500);
    }
};

/**
 * (Admin) Get details of a specific discount code by ID.
 * @param {string} discountId - The ID of the discount.
 * @returns {Promise<Discount>} The discount details.
 */
const getDiscountById = async (discountId) => {
    if (!mongoose.Types.ObjectId.isValid(discountId)) {
        throw new AppError('Invalid discount ID format.', 400);
    }
    const discount = await Discount.findById(discountId).lean();
    if (!discount) {
        throw new AppError('Discount code not found.', 404);
    }
    logger.info(`Admin: Fetched details for discount ID ${discountId}.`);
    return discount;
};

/**
 * (Admin) Update an existing discount code.
 * @param {string} discountId - The ID of the discount to update.
 * @param {object} updateData - Fields to update.
 * @returns {Promise<Discount>} The updated discount.
 */
const updateDiscount = async (discountId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(discountId)) {
        throw new AppError('Invalid discount ID format.', 400);
    }

    // Ensure code is uppercased if present in updateData
    if (updateData.code) {
        updateData.code = updateData.code.toUpperCase();
    }

    try {
        const updatedDiscount = await Discount.findByIdAndUpdate(discountId, updateData, {
            new: true, // Return the modified document
            runValidators: true, // Ensure updates adhere to schema validations
        }).lean();

        if (!updatedDiscount) {
            throw new AppError('Discount code not found for update.', 404);
        }
        logger.info(`Admin: Discount code ${updatedDiscount.code} (ID: ${discountId}) updated successfully.`);
        return updatedDiscount;
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error for 'code' if trying to change to an existing one
            throw new AppError(`Discount code '${updateData.code}' already exists.`, 409);
        }
        logger.error(`Admin: Error updating discount ${discountId}:`, error);
        if (error.name === 'ValidationError') {
            throw new AppError(`Validation Error: ${error.message}`, 400);
        }
        throw new AppError('Failed to update discount code.', 500);
    }
};

/**
 * (Admin) Delete a discount code.
 * @param {string} discountId - The ID of the discount to delete.
 * @returns {Promise<{ message: string }>} Confirmation message.
 */
const deleteDiscount = async (discountId) => {
    if (!mongoose.Types.ObjectId.isValid(discountId)) {
        throw new AppError('Invalid discount ID format.', 400);
    }
    const result = await Discount.findByIdAndDelete(discountId);
    if (!result) {
        throw new AppError('Discount code not found for deletion.', 404);
    }
    logger.info(`Admin: Discount code ID ${discountId} (Code: ${result.code}) deleted successfully.`);
    return { message: `Discount code '${result.code}' deleted successfully.` };
};


module.exports = {
    createDiscount,
    getAllDiscounts,
    getDiscountById,
    updateDiscount,
    deleteDiscount,
}; 