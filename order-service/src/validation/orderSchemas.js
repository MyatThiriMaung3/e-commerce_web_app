const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid Object ID format');

const checkoutSchema = Joi.object({
    // Assuming cart items are implicitly taken from the user context or a previous step,
    // otherwise they would need validation here.
    addressId: objectId.required(),
    discountCode: Joi.string().alphanum().length(5).optional().allow(''), // Allow empty string if no code
    pointsToUse: Joi.number().integer().min(0).optional().default(0), // Loyalty points to apply
    // Guest data structure can be added here if needed for validation
    guestData: Joi.object({
        email: Joi.string().email().required(),
        fullName: Joi.string().required(),
    }).optional(), // Required only if guest checkout
});

const orderIdParamSchema = Joi.object({
    id: objectId.required(),
});

module.exports = {
    checkoutSchema,
    orderIdParamSchema,
}; 