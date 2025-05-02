const axios = require('axios');
const logger = require('../config/logger'); // Import logger
require('dotenv').config(); // Ensure environment variables are loaded

// Load base URLs from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001/api/auth';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002/api/products';

// Helper to create standardized error messages
const createApiError = (serviceName, error, defaultStatus = 503) => {
    const statusCode = error.response?.status || defaultStatus;
    const message = `${serviceName} Error: ${error.response?.data?.message || error.message} (Status: ${statusCode})`;
    const apiError = new Error(message);
    apiError.statusCode = statusCode;
    apiError.service = serviceName; // Add service name for context
    // Log the error when it's created
    logger.warn(`API Client Error: ${message}`, { metadata: { serviceName, status: statusCode, errorData: error.response?.data, originalError: error.message } });
    return apiError;
};

/**
 * Creates an Axios instance for communicating with a specific service.
 * @param {string} baseURL - The base URL of the target service.
 * @param {string} [authToken] - Optional JWT token for authenticated requests.
 * @returns AxiosInstance
 */
const createApiClient = (baseURL, authToken) => {
    if (!baseURL) {
        const configError = new Error(`Configuration error: Base URL for service is missing.`);
        logger.error(configError.message, { metadata: { baseURL } });
        throw configError;
    }

    const headers = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const client = axios.create({
        baseURL,
        headers,
        timeout: parseInt(process.env.API_TIMEOUT || '5000', 10), // Use env var for timeout
    });

    // Optional: Add interceptors for logging requests/responses
    client.interceptors.request.use(request => {
        logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`, { metadata: { headers: request.headers, data: request.data } });
        return request;
    });

    client.interceptors.response.use(response => {
        logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status ${response.status}`, { metadata: { status: response.status, data: response.data } });
        return response;
    }, error => {
        // Log only the relevant parts of the error for API responses
        logger.warn(`API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status ${error.response?.status || '?'}`, { metadata: { status: error.response?.status, errorData: error.response?.data, message: error.message } });
        return Promise.reject(error); // Important to re-reject the error
    });

    return client;
};

// Export functions to get clients for each service
const getAuthServiceClient = (authToken) => createApiClient(AUTH_SERVICE_URL, authToken);
const getProductServiceClient = (authToken) => createApiClient(PRODUCT_SERVICE_URL, authToken);

// --- Product Service Interactions ---

/**
 * Validates product items (stock, price) with the Product service *before* order creation.
 * @param {Array} items - Array of items from the cart ({ productId, variantId, quantity })
 * @returns {Promise<Array>} - Promise resolving to an array of validated items with current details (price, name, image).
 * @throws {Error} - Throws API error if validation fails (e.g., out of stock, product not found, service unavailable).
 */
const validateProductItems = async (items) => {
    const serviceName = 'Product Service';
    const apiClient = getProductServiceClient(); // Assume no auth needed
    logger.info(`Calling ${serviceName} to validate items...`, { metadata: { itemCount: items.length } });
    try {
        const endpoint = '/validate-stock'; // Use relative path
        const payload = { items };
        const response = await apiClient.post(endpoint, payload);
        // Response logging handled by interceptor
        if (response.status === 200 && Array.isArray(response.data?.validatedItems)) {
            if (response.data.validatedItems.length !== items.length) {
                 throw new Error('Validation response item count mismatch.');
            }
            logger.info(`${serviceName} items validated successfully.`);
            return response.data.validatedItems;
        } else {
            throw new Error('Invalid response format from Product Service during item validation.');
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        throw createApiError(serviceName, error);
    }
};

/**
 * Decrements stock for purchased items via the Product service *after* order creation.
 * @param {Array} items - Array of items from the order ({ productId, variantId, quantity })
 * @returns {Promise<void>} - Resolves on success.
 * @throws {Error} - Throws API error if stock update fails.
 */
const decrementStock = async (items) => {
    const serviceName = 'Product Service';
    const apiClient = getProductServiceClient(); // Assume no auth needed
    if (!items || items.length === 0) {
        logger.info('No items provided for stock decrement.');
        return;
    }
    logger.info(`Calling ${serviceName} to decrement stock...`, { metadata: { itemCount: items.length } });
    try {
        const endpoint = '/decrement-stock'; // Use relative path
        const payload = { items };
        const response = await apiClient.post(endpoint, payload); // Using POST based on orderService
        // Response logging handled by interceptor
        if (response.status === 200 || response.status === 204) {
            logger.info(`Stock decremented successfully via ${serviceName}.`);
        } else {
            throw new Error(`Unexpected status code ${response.status} during stock decrement.`);
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        throw createApiError(serviceName, error);
    }
};


// --- Auth Service Interactions ---

/**
 * Finds or creates a user ID for a guest checkout via the Auth service.
 * @param {object} guestData - Object containing { email, fullName }
 * @returns {Promise<string>} - Promise resolving to the user ID.
 * @throws {Error} - Throws API error if operation fails.
 */
const findOrCreateGuestUser = async (guestData) => {
    const serviceName = 'Auth Service';
    const apiClient = getAuthServiceClient(); // No auth token for guest creation
    logger.info(`Calling ${serviceName} to find/create guest user...`, { metadata: { email: guestData.email } });
    try {
        const endpoint = '/users/guest'; // Use relative path - adjusted based on orderService usage
        const response = await apiClient.post(endpoint, guestData);
        // Response logging handled by interceptor
        if ((response.status === 200 || response.status === 201) && response.data?.userId) {
            logger.info(`${serviceName} returned userId: ${response.data.userId}`);
            // Return the whole user data if available, as orderService expects it
            return response.data; // { userId: "...", user: { ... } }
        } else {
            throw new Error('Invalid response or missing userId from Auth Service for guest.');
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        throw createApiError(serviceName, error);
    }
};

/**
 * Fetches the user's current loyalty points balance from the Auth service.
 * @param {string} userId - The ID of the user.
 * @param {string} authToken - The JWT token for authorization.
 * @returns {Promise<number>} - Promise resolving to the user's points balance.
 * @throws {Error} - Throws API error if fetching fails or token is invalid.
 */
const getUserData = async (userId, authToken) => {
    const serviceName = 'Auth Service';
    if (!authToken) throw new Error('Auth token is required to fetch user data.');
    const apiClient = getAuthServiceClient(authToken);
    logger.info(`Calling ${serviceName} to get user data...`, { metadata: { userId } });
    try {
        // ASSUMPTION: Auth service has a GET endpoint like /users/me or /users/{userId}
        // Returning { name, email, loyaltyPoints, addresses, cart }
        const endpoint = `/users/${userId}`; // Assuming endpoint requires userId
        const response = await apiClient.get(endpoint);
        // Response logging handled by interceptor
        if (response.status === 200 && response.data) {
            logger.info(`Fetched user data successfully for user ${userId}.`);
            return response.data;
        } else {
            throw new Error('Invalid response or missing data from Auth Service.');
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        throw createApiError(serviceName, error);
    }
};

/**
 * Updates (adds) the user's loyalty points earned from an order via the Auth service.
 * @param {string} userId - The ID of the user.
 * @param {number} pointsToAdd - The positive number of points earned.
 * @param {string} authToken - The JWT token for authorization.
 * @returns {Promise<void>} - Promise resolving on success.
 * @throws {Error} - Throws API error if update fails. (Optional: could choose not to throw)
 */
const updateUserLoyaltyPoints = async (userId, pointsToAdd, authToken) => {
    const serviceName = 'Auth Service';
    if (!authToken) {
        logger.warn('Cannot update loyalty points: Auth token is missing.');
         throw new Error('Auth token is required to update loyalty points.');
    }
    if (pointsToAdd <= 0) {
        logger.info('No points to add for loyalty update.', { metadata: { userId, pointsToAdd } });
        return;
    }
    logger.info(`Calling ${serviceName} to ADD loyalty points...`, { metadata: { userId, pointsToAdd } });
    const apiClient = getAuthServiceClient(authToken);
    try {
        // ASSUMPTION: PUT /users/{userId}/loyalty/add { points: pointsToAdd }
        const endpoint = `/users/${userId}/loyalty/add`;
        const payload = { points: pointsToAdd };
        const response = await apiClient.put(endpoint, payload);
        // Response logging handled by interceptor
        if (response.status === 200 || response.status === 204) {
            logger.info(`Loyalty points added successfully for user ${userId}.`);
        } else {
            throw new Error(`Unexpected status code ${response.status} during loyalty points addition.`);
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        // Don't throw critical error, just log via createApiError which returns the error
        createApiError(serviceName, error, 500);
    }
};


/**
 * Deducts spent loyalty points from a user's balance via the Auth service.
 * @param {string} userId - The ID of the user.
 * @param {number} pointsToDeduct - The positive number of points spent.
 * @param {string} authToken - The JWT token for authorization.
 * @returns {Promise<void>} - Promise resolving on success.
 * @throws {Error} - Throws API error if deduction fails (e.g., insufficient points).
 */
const deductUserLoyaltyPoints = async (userId, pointsToDeduct, authToken) => {
    const serviceName = 'Auth Service';
     if (!authToken) throw new Error('Auth token is required to deduct loyalty points.');
    if (pointsToDeduct <= 0) {
        logger.info('No points to deduct for loyalty.', { metadata: { userId, pointsToDeduct } });
        return;
    }
    logger.info(`Calling ${serviceName} to DEDUCT loyalty points...`, { metadata: { userId, pointsToDeduct } });
    const apiClient = getAuthServiceClient(authToken);
    try {
        // ASSUMPTION: PUT /users/{userId}/loyalty/deduct { points: pointsToDeduct }
        const endpoint = `/users/${userId}/loyalty/deduct`;
        const payload = { points: pointsToDeduct };
        const response = await apiClient.put(endpoint, payload);
        // Response logging handled by interceptor
        if (response.status === 200 || response.status === 204) {
            logger.info(`Loyalty points deducted successfully for user ${userId}.`);
        } else {
            throw new Error(`Unexpected status code ${response.status} during loyalty points deduction.`);
        }
    } catch (error) {
        // Error logging handled by interceptor & createApiError
        // This is more critical, so re-throw the error created by createApiError
        throw createApiError(serviceName, error);
    }
};


module.exports = {
    validateProductItems,
    decrementStock,
    findOrCreateGuestUser,
    getUserData,
    updateUserLoyaltyPoints,
    deductUserLoyaltyPoints,
    getAuthServiceClient,
    getProductServiceClient
}; 