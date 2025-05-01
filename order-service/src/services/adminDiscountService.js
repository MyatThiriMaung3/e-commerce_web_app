const Discount = require('../models/Discount');

/**
 * Creates a new discount code.
 * @param {object} discountData - Data for the new discount (code, value, maxUsage).
 * @returns {Promise<object>} - The newly created discount object.
 * @throws {Error} - Throws error if code already exists or on database error.
 */
const createDiscount = async (discountData) => {
    const { code, value, maxUsage } = discountData;

    // Check if code already exists using $toUpper to ensure case-insensitivity if needed,
    // although validation might handle this earlier. Mongoose unique index is case-sensitive by default.
    // Consider adding a pre-save hook in the model to uppercase the code if strict case-insensitivity needed.
    const existingDiscount = await Discount.findOne({ code: code }); // Assuming code is already uppercased by validation/controller
    if (existingDiscount) {
        // Throw a specific error type if needed, otherwise let global handler catch mongoose unique error (code 11000)
        throw new Error(`Discount code '${code}' already exists.`);
    }

    const newDiscount = new Discount({
        code, // Ensure code is uppercase before saving if required
        value,
        maxUsage: maxUsage // Joi validation should provide default if not present
    });

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