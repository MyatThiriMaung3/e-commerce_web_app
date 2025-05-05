// Centralized Error Handling Middleware

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
    console.error('--- Error Handler Caught --- ');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    // Log the stack trace for detailed debugging, especially in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('Stack Trace:', err.stack);
    }

    let statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
    let message = err.message || 'An unexpected error occurred.';

    // Handle specific error types for more granular responses

    // Joi Validation Errors (from controllers)
    if (err.isJoi === true) {
        statusCode = 400;
        // Provide more specific Joi error detail
        message = err.details && err.details.length > 0 ? err.details[0].message : 'Invalid input data.';
        console.error('Joi Validation Error Details:', err.details);
    }

    // Mongoose Validation Errors (from saving models)
    if (err.name === 'ValidationError') {
        statusCode = 400;
        // Combine multiple Mongoose validation errors if necessary
        // SAFER: Check if err.errors exists before trying to map it
        if (err.errors) {
            message = Object.values(err.errors).map(el => el.message).join(', ');
        } else {
            // Fallback if .errors is missing for some reason
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
        // Optionally include stack trace in development
        // stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });

    // We don't call next(err) here because this is the final error handler
};

module.exports = errorHandler; 