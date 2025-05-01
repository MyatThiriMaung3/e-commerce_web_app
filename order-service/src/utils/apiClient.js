const axios = require('axios');
require('dotenv').config(); // Ensure environment variables are loaded

// Load base URLs from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001/api/auth';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002/api/products';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004/api/notifications';

// Helper to create standardized error messages
const createApiError = (serviceName, error, defaultStatus = 503) => {
    const statusCode = error.response?.status || defaultStatus;
    const message = `${serviceName} Error: ${error.response?.data?.message || error.message} (Status: ${statusCode})`;
    const apiError = new Error(message);
    apiError.statusCode = statusCode;
    apiError.service = serviceName; // Add service name for context
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
        console.error(`Error: Base URL for a service is not defined in environment variables.`);
        // Depending on how critical this is, you might throw an error
        // or return a dummy client that always fails.
        // For now, let's throw to make the configuration issue obvious.
        throw new Error(`Configuration error: Base URL for service is missing.`);
    }

    const headers = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return axios.create({
        baseURL,
        headers,
        timeout: 5000, // Example timeout - adjust as needed
    });
};

// Export functions to get clients for each service
const getAuthServiceClient = (authToken) => createApiClient(AUTH_SERVICE_URL, authToken);
const getProductServiceClient = (authToken) => createApiClient(PRODUCT_SERVICE_URL, authToken);
const getNotificationServiceClient = (authToken) => createApiClient(NOTIFICATION_SERVICE_URL, authToken);

// --- Product Service Interactions ---

/**
 * Validates product items (stock, price) with the Product service *before* order creation.
 * @param {Array} items - Array of items from the cart ({ productId, variantId, quantity })
 * @returns {Promise<Array>} - Promise resolving to an array of validated items with current details (price, name, image).
 * @throws {Error} - Throws API error if validation fails (e.g., out of stock, product not found, service unavailable).
 */
const validateProductItems = async (items) => {
    console.log('Calling Product Service to validate items...');
    const serviceName = 'Product Service';
    try {
        // *** ASSUMPTION ***: Product service has a POST endpoint `/validate-checkout`
        // Expects: { items: [{ productId, variantId, quantity }] }
        // Returns: { validatedItems: [{ productId, variantId, quantity, price, name, image, stockAvailable }] } on 200 OK
        const endpoint = `${PRODUCT_SERVICE_URL}/validate-checkout`;
        const payload = { items };

        const response = await axios.post(endpoint, payload);

        if (response.status === 200 && Array.isArray(response.data?.validatedItems)) {
            // Simple check: ensure returned items match requested length
            if (response.data.validatedItems.length !== items.length) {
                 throw new Error('Validation response item count mismatch.');
            }
            // Optional: Deeper validation can be added here (e.g., check stockAvailable)
            console.log('Product items validated successfully by Product Service.');
            return response.data.validatedItems;
        } else {
            throw new Error('Invalid response format from Product Service during item validation.');
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for item validation:`, error.message);
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
    console.log('Calling Product Service to decrement stock...');
    const serviceName = 'Product Service';
    if (!items || items.length === 0) {
        console.log('No items provided for stock decrement.');
        return;
    }
    try {
        // *** ASSUMPTION ***: Product service has a PUT endpoint `/stock/decrement`
        // Expects: { items: [{ productId, variantId, quantity }] }
        // Returns: 200 OK or 204 No Content on success.
        const endpoint = `${PRODUCT_SERVICE_URL}/stock/decrement`;
        const payload = { items };

        const response = await axios.put(endpoint, payload); // Using PUT as it modifies resource state

        if (response.status === 200 || response.status === 204) {
            console.log('Stock decremented successfully via Product Service.');
        } else {
            throw new Error(`Unexpected status code ${response.status} during stock decrement.`);
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for stock decrement:`, error.message);
        // If stock decrement fails AFTER order is placed, this is a problem.
        // Should potentially trigger a compensating action or log for manual intervention.
        // For now, we re-throw the error to make the calling function aware.
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
    console.log(`Calling Auth Service to find/create guest user: ${guestData.email}`);
    const serviceName = 'Auth Service';
    try {
        // *** ASSUMPTION ***: Auth service has a POST endpoint `/guest`
        // Expects: { email, fullName }
        // Returns: { userId: "..." } on 200 OK or 201 Created.
        const endpoint = `${AUTH_SERVICE_URL}/guest`;
        const response = await axios.post(endpoint, guestData);

        if ((response.status === 200 || response.status === 201) && response.data?.userId) {
            console.log(`Auth Service returned userId: ${response.data.userId}`);
            return response.data.userId;
        } else {
            throw new Error('Invalid response or missing userId from Auth Service for guest.');
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for guest user:`, error.message);
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
const getUserLoyaltyPoints = async (userId, authToken) => {
    console.log(`Calling Auth Service to get loyalty points for user ${userId}`);
    const serviceName = 'Auth Service';
    if (!authToken) throw new Error('Auth token is required to fetch loyalty points.');

    try {
        // *** ASSUMPTION ***: Auth service has a GET endpoint `/users/{userId}/loyalty`
        // Requires: Authorization Header
        // Returns: { ownedLoyaltyPoints: number } on 200 OK.
        const endpoint = `${AUTH_SERVICE_URL}/users/${userId}/loyalty`;
        const config = {
            headers: { 'Authorization': `Bearer ${authToken}` }
        };

        const response = await axios.get(endpoint, config);

        if (response.status === 200 && typeof response.data?.ownedLoyaltyPoints === 'number') {
            console.log(`Fetched loyalty points for user ${userId}: ${response.data.ownedLoyaltyPoints}`);
            return response.data.ownedLoyaltyPoints;
        } else {
            throw new Error('Invalid response or missing points from Auth Service.');
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} to get loyalty points for user ${userId}:`, error.message);
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
    console.log(`Calling Auth Service to ADD loyalty points for user ${userId} by ${pointsToAdd}`);
    const serviceName = 'Auth Service';
    if (!authToken) {
        console.warn('Cannot update loyalty points: Auth token is missing.');
        // Decide if this is critical - maybe guests don't earn points? Or throw?
         throw new Error('Auth token is required to update loyalty points.');
        // return;
    }
    if (pointsToAdd <= 0) {
        console.log('No points to add.');
        return;
    }
    try {
        // *** ASSUMPTION ***: Auth service has a PUT endpoint `/users/{userId}/loyalty/add`
        // Requires: Authorization Header
        // Expects: { points: pointsToAdd }
        // Returns: 200 OK or 204 No Content on success.
        const endpoint = `${AUTH_SERVICE_URL}/users/${userId}/loyalty/add`; // More specific endpoint?
        const payload = { points: pointsToAdd };
        const config = {
            headers: { 'Authorization': `Bearer ${authToken}` }
        };

        const response = await axios.put(endpoint, payload, config);

        if (response.status === 200 || response.status === 204) {
            console.log(`Loyalty points added successfully for user ${userId}.`);
        } else {
            throw new Error(`Unexpected status code ${response.status} during loyalty points addition.`);
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for loyalty points addition (User ${userId}):`, error.message);
        // Decide if this failure should stop the whole checkout? Probably not critical. Log and continue.
        // For now, re-throw to signal the issue, but could be removed.
        throw createApiError(serviceName, error, 500); // Use 500 as default status if not critical
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
    console.log(`Calling Auth Service to DEDUCT loyalty points for user ${userId} by ${pointsToDeduct}`);
    const serviceName = 'Auth Service';
     if (!authToken) throw new Error('Auth token is required to deduct loyalty points.');
    if (pointsToDeduct <= 0) {
        console.log('No points to deduct.');
        return;
    }
    try {
        // *** ASSUMPTION ***: Auth service has a PUT endpoint `/users/{userId}/loyalty/deduct`
        // Requires: Authorization Header
        // Expects: { points: pointsToDeduct }
        // Returns: 200 OK or 204 No Content on success. Might return 400/422 if insufficient points.
        const endpoint = `${AUTH_SERVICE_URL}/users/${userId}/loyalty/deduct`;
        const payload = { points: pointsToDeduct };
        const config = {
            headers: { 'Authorization': `Bearer ${authToken}` }
        };

        const response = await axios.put(endpoint, payload, config);

        if (response.status === 200 || response.status === 204) {
            console.log(`Loyalty points deducted successfully for user ${userId}.`);
        } else {
            // This could happen if e.g. points were spent elsewhere concurrently
            throw new Error(`Unexpected status code ${response.status} during loyalty points deduction.`);
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for loyalty points deduction (User ${userId}):`, error.message);
        // This is more critical - if deduction fails, the order price was wrong.
        // Re-throw the error. Consider compensating actions in the caller.
        throw createApiError(serviceName, error); // Let the caller handle this failure
    }
};


// --- Notification Service Interactions ---

/**
 * Sends the order confirmation details to the Notification service.
 * @param {object} orderData - The complete order object.
 * @returns {Promise<void>} - Promise resolving on successful request initiation (doesn't guarantee email sent).
 */
const sendOrderConfirmationNotification = async (orderData) => {
    console.log(`Calling Notification Service to send confirmation for order ${orderData._id}`);
    const serviceName = 'Notification Service';
    try {
        // *** ASSUMPTION ***: Notification service has a POST endpoint `/send/order-confirmation`
        // Expects: Full order object (or subset needed for email)
        // Returns: 202 Accepted or 200 OK on success.
        const endpoint = `${NOTIFICATION_SERVICE_URL}/send/order-confirmation`;
        const payload = orderData; // Sending the whole object for simplicity

        const response = await axios.post(endpoint, payload);

        if (response.status === 200 || response.status === 202) {
            console.log(`Order confirmation notification request sent successfully for order ${orderData._id}.`);
        } else {
             console.warn(`Unexpected status code ${response.status} from ${serviceName}. Email might not be sent.`);
        }
    } catch (error) {
        console.error(`Error calling ${serviceName} for order ${orderData._id}:`, error.message);
        // Do not re-throw, as order creation succeeded. Log the notification failure.
        // We don't use createApiError here as we don't want to throw.
    }
};


module.exports = {
    validateProductItems,
    decrementStock,
    findOrCreateGuestUser,
    getUserLoyaltyPoints,
    updateUserLoyaltyPoints,
    deductUserLoyaltyPoints,
    sendOrderConfirmationNotification,
    getAuthServiceClient,
    getProductServiceClient,
    getNotificationServiceClient
}; 