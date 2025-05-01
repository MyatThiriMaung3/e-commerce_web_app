# Order Service

This microservice is responsible for managing orders, discounts, and the checkout process within the E-Commerce Web Application.

## Overview

The Order Service handles:
-   Processing customer checkouts (including guest checkouts).
-   Validating products and stock via the Product Service.
-   Validating and applying discount codes.
-   Calculating final order totals (including tax, shipping, discounts, loyalty points).
-   Creating and storing order details.
-   Managing order statuses.
-   Retrieving order history for users.
-   Interacting with the Auth Service for user details, guest handling, and loyalty points.
-   Interacting with the Notification Service to trigger order confirmations.
-   Providing admin endpoints for managing orders and discounts.

## Prerequisites

-   Node.js (v18+ recommended)
-   npm or yarn
-   MongoDB instance (local or cloud)
-   Access to other running microservices (Auth, Product, Notification) during runtime (URLs configured via environment variables).

## Installation

1.  Navigate to the `order-service` directory:
    ```bash
    cd order-service
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Environment Variables

Create a `.env` file in the `order-service` root directory and add the following variables:

```env
# Service Configuration
ORDER_SERVICE_PORT=5003 # Port for the order service
NODE_ENV=development    # or production

# Database Configuration
ORDER_MONGO_URI="mongodb://localhost:27017/ecommerce_orders" # Connection string for the orders database

# JWT Secret (Must match the secret used in Auth Service for token verification)
JWT_SECRET="your_jwt_secret_key_here"

# Other Service URLs
AUTH_SERVICE_URL="http://localhost:5001/api/auth"         # URL for the Auth Service
PRODUCT_SERVICE_URL="http://localhost:5002/api/products"     # URL for the Product Service
NOTIFICATION_SERVICE_URL="http://localhost:5004/api/notifications" # URL for the Notification Service
```

For running tests, create a `.env.test` file:

```env
NODE_ENV=test
TEST_MONGO_URI="mongodb://localhost:27017/ecommerce_orders_test" # SEPARATE database for testing
# Include other variables like JWT_SECRET and service URLs if needed by tests
JWT_SECRET="your_jwt_secret_key_here"
AUTH_SERVICE_URL="http://localhost:5001/api/auth" 
PRODUCT_SERVICE_URL="http://localhost:5002/api/products"
NOTIFICATION_SERVICE_URL="http://localhost:5004/api/notifications"
```

*(Note: A `.env.example` file should ideally be committed to git, listing required variables without their values.)*

## Running the Service

-   **Development (with nodemon):**
    ```bash
    npm run dev
    ```
-   **Production:**
    ```bash
    npm start
    ```

## Running Tests

Ensure your test MongoDB instance (specified in `TEST_MONGO_URI`) is running.

```bash
npm test
```

## API Endpoints

### User Routes (Prefix: `/api/orders`)

-   `POST /checkout`:
    -   Processes the shopping cart checkout.
    -   Handles both authenticated users (requires `Authorization: Bearer <token>`) and guests (requires `guestData` in body).
    -   Body includes `addressId`, optional `discountCode`, optional `pointsToUse`, optional `guestData` (for guest checkout).
    -   **Internal Workflow:**
        -   If guest: Calls Auth Service to find/create guest user.
        -   Calls Auth Service to fetch user's cart, address details (by `addressId`), and loyalty points.
        -   Calls Product Service to validate item stock and fetch current product details (price, name, image).
        -   Calculates totals, applies discounts (local check), and applies loyalty points.
        -   Saves order locally and increments discount usage count.
        -   *Asynchronously* calls Product Service to decrement stock.
        -   *Asynchronously* calls Auth Service to update user's loyalty points (deduct used, add earned).
        -   *Asynchronously* calls Notification Service to trigger order confirmation email.
    -   Returns the created order object (201).
-   `GET /my-history`:
    -   Retrieves the order history for the authenticated user.
    -   Requires `Authorization: Bearer <token>`.
    -   Returns an array of order objects (200).
-   `GET /:id`:
    -   Retrieves details for a specific order belonging to the authenticated user.
    -   Requires `Authorization: Bearer <token>`.
    -   Returns the order object (200) or 404 if not found/not owned.

### Discount Validation Route (Prefix: `/api/discounts`)

-   `POST /validate`:
    -   Validates a discount code.
    -   Body: `{ "code": "CODE5" }`
    -   Returns discount details (200) or error (400/404).

### Admin Routes (Prefix: `/api/admin`)

*(Requires Admin Authentication & Authorization)*

-   `GET /orders`:
    -   Retrieves a paginated list of all orders in the system.
    -   Supports query params: `page`, `limit`, potentially date filters.
    -   Returns `{ orders: [...], pagination: {...} }` (200).
-   `PUT /orders/:id/status`:
    -   Updates the status of a specific order.
    -   Body: `{ "status": "confirmed" | "shipping" | "delivered" }`
    -   Returns the updated order object (200).
-   `GET /discounts`:
    -   Retrieves a list of all discount codes.
    -   Returns an array of discount objects (200).
-   `POST /discounts`:
    -   Creates a new discount code.
    -   Body: `{ "code": "NEWCD", "value": 15, "maxUsage": 5 }`
    -   Returns the created discount object (201).

## Further Development

-   Verify and refine inter-service API call assumptions in `src/utils/apiClient.js` once other services are stable.
-   Implement more robust error handling for specific API error responses.
-   Add more comprehensive integration tests, especially covering failure scenarios in post-order steps.
-   Consider adding API documentation generation (e.g., Swagger).
-   Implement configurable tax rates and shipping fee calculations. 