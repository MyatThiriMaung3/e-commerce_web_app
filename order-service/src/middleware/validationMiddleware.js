const Joi = require('joi');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Middleware factory to validate request data (body, query, params) against a Joi schema.
 * @param {Joi.Schema} schema - The Joi schema to validate against.
 * @param {'body'|'query'|'params'} [source='body'] - The source of data in the request object.
 * @returns {Function} Express middleware function.
 */
const validateRequest = (schema, source = 'body') => {
    return (req, res, next) => {
        const dataToValidate = req[source];

        // Use Joi validation options for better error messages and defaults
        const options = {
            abortEarly: false, // Return all errors
            allowUnknown: true, // Allow properties not defined in schema (can be false for strictness)
            stripUnknown: true, // Remove unknown properties (can be false)
        };

        const { error, value } = schema.validate(dataToValidate, options);

        if (error) {
            // Format Joi error messages for a user-friendly response
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            logger.warn(`Validation failed for req.${source}:`, { metadata: { error: errorMessage, data: dataToValidate } });
            return next(new AppError(`Validation Error: ${errorMessage}`, 400));
        }

        // Replace the original data with the validated (and potentially transformed/defaulted) data
        req[source] = value;
        next();
    };
};

module.exports = { validateRequest }; 