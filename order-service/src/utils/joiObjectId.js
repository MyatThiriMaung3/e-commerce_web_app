const Joi = require('joi');

/**
 * Creates a Joi schema for validating a MongoDB ObjectId string 
 * typically passed as a URL parameter.
 * 
 * @param {string} paramName - The name of the parameter (e.g., 'id', 'orderId').
 * @returns {Joi.ObjectSchema} A Joi object schema for the parameter.
 */
const joiObjectId = (paramName) => {
    return Joi.object({
        [paramName]: Joi.string().hex().length(24).required().messages({
            'string.base': `${paramName} must be a string`,
            'string.hex': `${paramName} must be a valid hexadecimal ObjectId`,
            'string.length': `${paramName} must be 24 characters long`,
            'any.required': `${paramName} is required`
        })
    });
};

module.exports = joiObjectId; 