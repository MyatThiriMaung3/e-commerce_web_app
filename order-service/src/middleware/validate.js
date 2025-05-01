const Joi = require('joi');

// Generic middleware to validate request data against a Joi schema
// location can be 'body', 'query', or 'params'
const validateRequest = (schema, location = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[location], {
            abortEarly: false, // Report all errors, not just the first
            allowUnknown: true, // Allow properties not defined in the schema (can be adjusted)
            stripUnknown: true // Remove unknown properties from the validated object (can be adjusted)
        });

        if (error) {
            // Pass the Joi error object to the central error handler
            // The error handler should check for `error.isJoi === true`
            console.log(`Validation Error [${location}]:`, error.details.map(d => d.message).join(', '));
            return next(error);
        }

        // Attach validated data to the request (optional, useful if stripUnknown is true)
        // req[`validated${location.charAt(0).toUpperCase() + location.slice(1)}`] = value;

        next(); // Validation passed
    };
};

module.exports = validateRequest; 