const Discount = require('../models/Discount');

/**
 * Creates a new discount code.
 * @param {object} discountData - Data for the new discount (code, value, maxUsage).
 * @returns {Promise<object>} - The newly created discount object.
 * @throws {Error} - Throws error if code already exists or on database error.
 */
const createDiscount = async (discountData) => {
    // const { code, value, maxUsage } = discountData; // Don't destructure here

    // Check if code already exists
    // Ensure we check against the correct case (Joi schema now uppercases)
    const existingDiscount = await Discount.findOne({ code: discountData.code });
    if (existingDiscount) {
        throw new Error(`Discount code '${discountData.code}' already exists.`);
    }

    // Pass the whole object to the constructor
    const newDiscount = new Discount(discountData);

    const savedDiscount = await newDiscount.save();
    return savedDiscount;

    // Note: Mongoose duplicate key error (11000) will be caught by asyncHandler -> errorHandler
};

/**
 * Lists all discount codes with pagination.
 * @param {object} pagination - Pagination options (e.g., { page, limit }).
 * @returns {Promise<object>} - An object containing discounts array and pagination info.
 */
const listAllDiscounts = async (pagination = { page: 1, limit: 20 }) => {
    const { page, limit } = pagination;
    // Basic input validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Ensure limit is reasonable
    const skip = (pageNum - 1) * limitNum;

    const discounts = await Discount.find()
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limitNum);

    const totalDiscounts = await Discount.countDocuments();
    const totalPages = Math.ceil(totalDiscounts / limitNum);

    return {
        discounts,
        currentPage: pageNum,
        totalPages,
        totalDiscounts
    };

    // Errors during find/countDocuments will be caught by asyncHandler -> errorHandler
};

module.exports = {
    createDiscount,
    listAllDiscounts
}; 