const axios = require('axios');
const logger = require('../config/logger'); // Import logger
require('dotenv').config(); // Ensure environment variables are loaded
const mongoose = require('mongoose');

// Load base URLs from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001/api/auth';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002/api/products';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT) || 5000;

// Flags to control using mock data
const USE_MOCK_AUTH_SERVICE = process.env.USE_MOCK_AUTH_SERVICE === 'true';
const USE_MOCK_PRODUCT_SERVICE = process.env.USE_MOCK_PRODUCT_SERVICE === 'true';

// Custom Error for API client issues
class ApiClientError extends Error {
    constructor(message, statusCode = 500, serviceName = 'Unknown Service') {
        super(message);
        this.name = 'ApiClientError';
        this.statusCode = statusCode;
        this.serviceName = serviceName;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const createApiError = (error, serviceName) => {
    let statusCode = 500;
    let message = 'An unexpected error occurred with a dependent service.';

    if (error.isAxiosError) {
    if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            statusCode = error.response.status;
            message = error.response.data?.message || error.response.data || `Request failed with status code ${statusCode}`;
            logger.error(`Error from ${serviceName}: ${statusCode} - ${message}`, {
                metadata: { url: error.config?.url, method: error.config?.method, responseData: error.response.data }
            });
    } else if (error.request) {
            // The request was made but no response was received
            statusCode = 503; // Service Unavailable
            message = `No response received from ${serviceName}. Service may be down or unreachable.`;
            logger.error(message, { metadata: { url: error.config?.url, method: error.config?.method } });
        } else {
            // Something happened in setting up the request that triggered an Error
            message = `Error setting up request to ${serviceName}: ${error.message}`;
            logger.error(message);
        }
    } else {
        // Not an Axios error, but still an error from the API interaction logic
        message = error.message || message;
        if (error.statusCode) statusCode = error.statusCode;
        logger.error(`Non-Axios error during ${serviceName} call: ${message}`);
    }
    return new ApiClientError(message, statusCode, serviceName);
};

/**
 * Creates an Axios instance for communicating with a specific service.
 * @param {string} baseURL - The base URL of the target service.
 * @param {string} [authToken] - Optional JWT token for authenticated requests.
 * @returns AxiosInstance
 */
const createAxiosInstance = (baseURL, authToken) => {
    if (!baseURL) {
        const configError = new ApiClientError(`Configuration error: Base URL for service is missing.`, 500, 'API Client Setup');
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
        timeout: API_TIMEOUT,
    });

    // Optional: Add interceptors for logging requests/responses
    client.interceptors.request.use(request => {
        logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
        return request;
    });

    client.interceptors.response.use(response => {
        logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status ${response.status}`);
        return response;
    }, error => {
        // The createApiError function will handle detailed logging
        return Promise.reject(error); // Important to re-reject the error
    });

    return client;
};

// Export functions to get clients for each service
const getAuthServiceClient = (authToken) => createAxiosInstance(AUTH_SERVICE_URL, authToken);
const getProductServiceClient = (authToken) => createAxiosInstance(PRODUCT_SERVICE_URL, authToken);

// --- Product Service Interactions ---

/**
 * Validates product items (stock, price) with the Product service *before* order creation.
 * @param {Array} items - Array of items from the cart ({ productId, variantId, quantity })
 * @returns {Promise<Array>} - Promise resolving to an array of validated items with current details (price, name, image).
 * @throws {Error} - Throws API error if validation fails (e.g., out of stock, product not found, service unavailable).
 */
const validateProductItems = async (items) => {
    const serviceName = 'ProductService';
    logger.info(`Calling ${serviceName} to validate ${items.length} items...`);
    if (USE_MOCK_PRODUCT_SERVICE) {
        logger.warn('Using mock ProductService.validateProductItems');
        return items.map((item, index) => ({
            ...item,
            productId: item.productId.toString(),
            variantId: item.variantId.toString(),
            price: parseFloat((Math.random() * 100 + 20).toFixed(2)), // Random price
            name: `MockProd-${item.productId.slice(-4)} Var-${item.variantId.slice(-4)}`,
            variantName: `MockVariant ${index + 1}`,
            image: `https://via.placeholder.com/150/0000FF/808080?Text=MockProduct${index + 1}`,
            availableStock: 50 + index * 10, // Assume enough stock
            // Add any other fields the order service expects, like category, brand, etc. if needed
        }));
    }

    const client = getProductServiceClient(); // Auth token might be needed depending on product service setup
    try {
        // REAL Product Service call
        const endpoint = '/validate-items'; // Hypothetical endpoint
        logger.info(`Attempting REAL call to ${serviceName}: POST ${endpoint}`);
        const response = await client.post(endpoint, { items });

        if (response.status === 200 && response.data?.validatedItems) {
            logger.info(`${serviceName} items validated successfully via REAL call.`);
            // Ensure the response format matches what the mock provides
            return response.data.validatedItems.map(item => ({
                productId: item.productId, // Assuming product service returns string IDs
                variantId: item.variantId,
                price: item.price,
                name: item.name,
                variantName: item.variantName,
                image: item.image,
                availableStock: item.availableStock,
                ...item // Include any other fields returned
            }));
        }
        throw new Error(`Invalid response or structure from ${serviceName} during item validation. Status: ${response.status}`);
    } catch (error) {
        logger.error(`REAL call to ${serviceName}.validateProductItems FAILED.`);
        throw createApiError(error, serviceName);
    }
};

/**
 * Decrements stock for purchased items via the Product service *after* order creation.
 * @param {Array} items - Array of items from the order ({ productId, variantId, quantity })
 * @returns {Promise<void>} - Resolves on success.
 * @throws {Error} - Throws API error if stock update fails.
 */
const decrementStock = async (items) => {
    const serviceName = 'ProductService';
    logger.info(`Calling ${serviceName} to decrement stock for ${items.length} item types...`);
    if (USE_MOCK_PRODUCT_SERVICE) {
        logger.warn('Using mock ProductService.decrementStock - Simulating success.');
        return { success: true, message: 'Mock stock successfully decremented for all items.' };
    }

    const client = getProductServiceClient(); // Auth token might be needed
    try {
        // REAL Product Service call
        const endpoint = '/decrement-stock'; // Hypothetical endpoint
        logger.info(`Attempting REAL call to ${serviceName}: POST ${endpoint}`);
        const response = await client.post(endpoint, { items });

        if (response.status === 200 && response.data?.success) {
            logger.info(`Stock decremented successfully via REAL call to ${serviceName}.`);
            return response.data;
        }
        throw new Error(response.data?.message || `Failed to decrement stock in ${serviceName}. Status: ${response.status}`);
    } catch (error) {
        logger.error(`REAL call to ${serviceName}.decrementStock FAILED.`);
        throw createApiError(error, serviceName);
    }
};

// --- Auth Service Interactions ---

/**
 * Fetches basic user data from the Authentication Service.
 * Now ONLY fetches info needed by order-service (e.g., email, name, addresses), 
 * NOT cart or loyalty points which are managed internally.
 * 
 * @param {string} userId - The ID of the user.
 * @param {string} authToken - The JWT token for authorization.
 * @returns {Promise<object>} - User data (e.g., { id, email, fullName, addresses: [...] }).
 */
const getUserData = async (userId, authToken) => {
    const serviceName = 'AuthService';
    logger.info(`Calling ${serviceName} to get user data for ${userId}...`);
    if (USE_MOCK_AUTH_SERVICE) {
        logger.warn('Using mock AuthService.getUserData');
        // Use a specific email for the known mock authenticated user ID used in tests
        // MOCK_AUTHENTICATED_USER_ID is defined in authMiddleware.js, we need it here or re-define.
        // For simplicity, let's assume MOCK_AUTHENTICATED_USER_ID is '605160516051605160516052'
        // We should ideally import it or have it in a shared constant.
        const MOCK_AUTH_USER_ID_FOR_TESTING = '605160516051605160516052';
        let userEmail = `mockuser_${userId.slice(-4)}@example.com`;
        let userFullName = `Mock User ${userId.slice(-4)}`;

        if (userId === MOCK_AUTH_USER_ID_FOR_TESTING) {
            userEmail = 'thekings30799@gmail.com';
            userFullName = 'Mock Test User (via APIClient)'; // To distinguish from authMiddleware set name
        }

        return {
            id: userId,
            _id: userId, // Often _id is used
            email: userEmail,
            fullName: userFullName,
            addresses: [
                { _id: new mongoose.Types.ObjectId().toString(), label: 'Home', addressLine: '123 Mock St', city: 'Mockville', zip: '12345', country: 'MCK', phoneNumber: '555-0100' },
                { _id: new mongoose.Types.ObjectId().toString(), label: 'Work', addressLine: '789 Dev Ln', city: 'Codeburg', zip: '67890', country: 'MCK', phoneNumber: '555-0200' },
            ],
            // CRUCIALLY: NO cart, NO loyalty points here. Order service handles those.
        };
    }

    const client = getAuthServiceClient(authToken);
    if (!authToken) {
        logger.warn(`Attempting to call ${serviceName}.getUserData without authToken for user ${userId}. This might fail.`);
        // Depending on auth-service API design, this might be okay for internal calls or need a system token.
        // For now, proceed but log warning.
    }
    try {
        // REAL Auth Service call
        // Endpoint might be /users/me (if using token) or /users/:id/profile (if admin call)
        const endpoint = `/users/${userId}/profile`; // Hypothetical endpoint for direct fetch
        logger.info(`Attempting REAL call to ${serviceName}: GET ${endpoint}`);
        const response = await client.get(endpoint);

        if (response.status === 200 && response.data) {
            logger.info(`User data fetched successfully from ${serviceName} via REAL call for user ${userId}.`);
            // Ensure response ONLY contains expected fields (id, email, fullName, addresses)
            // Filter here if necessary to prevent leaking unexpected data.
        return {
                id: response.data.id || response.data._id,
                _id: response.data._id || response.data.id,
                email: response.data.email,
                fullName: response.data.fullName,
                addresses: response.data.addresses || [],
            };
        }
        throw new Error(`Invalid response from ${serviceName} for user data. Status: ${response.status}`);
    } catch (error) {
        logger.error(`REAL call to ${serviceName}.getUserData FAILED.`);
        // Avoid throwing if it was an optional fetch (e.g., for notification name)
        // Instead, return null or an empty object after logging the error.
        // throw createApiError(error, serviceName);
         return null; // Return null on failure to avoid breaking calling logic (like notifications)
    }
};

/**
 * Finds or creates a user ID for a guest checkout via the Auth service.
 * @param {object} guestData - Object containing { email, fullName }
 * @returns {Promise<string>} - Promise resolving to the user ID.
 * @throws {Error} - Throws API error if operation fails.
 */
const findOrCreateGuestUser = async (guestData) => {
    const serviceName = 'AuthService';
    logger.info(`Calling ${serviceName} to find/create guest user for email: ${guestData.email}`);
    if (USE_MOCK_AUTH_SERVICE) {
        logger.warn('Using mock AuthService.findOrCreateGuestUser');
        const mockUserId = new mongoose.Types.ObjectId().toString();
        return {
            userId: mockUserId,
            isNewUser: true, // or false if found
            user: { 
                _id: mockUserId,
                id: mockUserId,
                email: guestData.email,
                fullName: guestData.fullName || 'Guest User',
                isGuest: true,
                // Other minimal guest user fields if any
        }
        };
    }

    const client = getAuthServiceClient(); // No auth token for this usually
    try {
        // REAL Auth Service call
        const endpoint = '/users/guest'; // Hypothetical endpoint
        logger.info(`Attempting REAL call to ${serviceName}: POST ${endpoint}`);
        const response = await client.post(endpoint, guestData);

        if ((response.status === 200 || response.status === 201) && response.data?.userId && response.data?.user) {
            logger.info(`${serviceName} found/created guest user: ${response.data.userId} via REAL call.`);
            return response.data; // Expected: { userId: "...", user: { ... }, isNewUser: boolean }
        }
        throw new Error(`Invalid response from ${serviceName} for guest user handling. Status: ${response.status}`);
        } catch (error) {
        logger.error(`REAL call to ${serviceName}.findOrCreateGuestUser FAILED.`);
            throw createApiError(error, serviceName);
    }
};

module.exports = {
    getAuthServiceClient,
    getProductServiceClient,
    validateProductItems,
    decrementStock,
    getUserData,
    findOrCreateGuestUser,
    ApiClientError: createApiError
}; 