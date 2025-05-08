// Centralized Error Handling Middleware
const logger = require('../config/logger'); // RESTORED

// Import any custom error classes if needed
// const { CheckoutError } = require('../services/orderService'); // Example if CheckoutError was defined there

// Custom Error class defined in orderService can be caught here, or define a base error class
class CheckoutError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'CheckoutError';
        this.statusCode = statusCode;
    }
}

const errorHandler = (err, req, res, next) => {
    logger.error('--- Error Handler Caught ---', { // RESTORED
        name: err.name, 
        message: err.message, 
        status: err.statusCode, 
        // Include stack only if not in production, or if explicitly desired
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        details: err.details, // For Joi errors
        keyValue: err.keyValue // For Mongo duplicate errors
    });

    // Check if a status code was already set on the response (e.g., by notFound handler)
    // If so, use it; otherwise, use the error's statusCode or default to 500.
    let statusCode = res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);
    let message = err.message || 'An unexpected error occurred.';

    // Handle specific error types for more granular responses

    // Joi Validation Errors (from controllers)
    if (err.isJoi === true) {
        statusCode = 400;
        // Provide more specific Joi error detail
        message = err.details && err.details.length > 0 ? err.details[0].message : 'Invalid input data.';
        // Already logged above with details
    }

    // Mongoose Validation Errors (from saving models)
    if (err.name === 'ValidationError') {
        statusCode = 400;
        if (err.errors) {
            message = Object.values(err.errors).map(el => el.message).join(', ');
        } else {
            message = err.message || 'Mongoose validation error (details unavailable)';
        }
    }

    // Mongoose Cast Errors (e.g., invalid ObjectId format in params)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 400;
        message = `Invalid ID format for resource: ${err.value}`;
    }

    // Mongoose Duplicate Key Errors (e.g., unique constraint violation)
    if (err.code === 11000) {
        statusCode = 409; // Conflict
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate field value entered for: ${field}. Please use another value.`;
    }

    // Custom Application Errors (like CheckoutError)
    if (err instanceof CheckoutError) {
        statusCode = err.statusCode;
        message = err.message;
    }

    // Simplify message for generic 500 errors in production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'An internal server error occurred.';
    }

    // Send the standardized JSON error response
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message
        // Optionally include stack trace in development JSON response
        // stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });

    // We don't call next(err) here because this is the final error handler
};

// 404 Not Found handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Pass it to the global error handler
};

// module.exports = errorHandler; // Old export
module.exports = { errorHandler, notFound }; // New export 