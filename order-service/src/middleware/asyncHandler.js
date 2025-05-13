// Simple utility to wrap async route handlers and catch errors
// Passes errors to the next() middleware (our global error handler)
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler; 