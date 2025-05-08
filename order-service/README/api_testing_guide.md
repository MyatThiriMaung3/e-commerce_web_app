# Order Service API Endpoint Testing Guide

This guide provides detailed instructions on how to test all API endpoints in the `order-service` using a tool like Postman.

## General Prerequisites

1.  **Services Running:** Ensure `order-service`, `mongodb_instance`, and `rabbitmq` are running (e.g., via `docker-compose up -d order-service mongo rabbitmq`).
2.  **Base URL:** `http://localhost:5003` (unless configured differently).
3.  **Authentication & Session IDs:**
    *   **User Routes:** Routes requiring user authentication need a JWT from a standard user (`<user_token>`). Obtain this from your `auth-service`. Add an `Authorization` header: `Bearer <user_token>`.
    *   **Guest Routes:** Routes supporting guest access (like most cart operations) require a Session ID. Provide this using the `X-Session-ID` header: `X-Session-ID: <some_unique_session_string>`.
    *   **Admin Routes:** Routes requiring admin privileges need a JWT from an admin user (`<admin_token>`). Add an `Authorization` header: `Bearer <admin_token>`.
4.  **`Content-Type` Header:** For `POST`/`PUT` requests with a JSON body, set `Content-Type: application/json`.
5.  **Environment Variables (`order-service/.env`):
    *   `MOCK_EXTERNAL_CALLS=true`: Set to `true` for isolated testing with mocks for other services (auth, product). Set to `false` for integration testing.
    *   `JWT_SECRET`: Must match the secret used to sign your test JWTs.

---

## A. Cart Routes (`/api/cart`)

These routes work for both authenticated users and guests.
*   **For Users:** Use `Authorization: Bearer <user_token>` header.
*   **For Guests:** Use `X-Session-ID: <guest_session_id>` header.

### 1. Get Cart
*   **Method:** `GET`
*   **Path:** `/api/cart`
*   **Headers:** `Authorization: Bearer <user_token>` **OR** `X-Session-ID: <guest_session_id>`
*   **Body:** None
*   **Expected Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "cart": {
                "_id": "some_cart_id",
                "userId": "user_object_id_if_user", // null for guests
                "sessionId": "guest_session_id_if_guest", // null for users
                "items": [],
                "lastUpdatedAt": "2025-05-07T...",
                "totalQuantity": 0,
                "totalPrice": 0
            }
        }
    }
    ```

### 2. Add Item to Cart
*   **Method:** `POST`
*   **Path:** `/api/cart/items`
*   **Headers:** (`Authorization: Bearer <user_token>` **OR** `X-Session-ID: <guest_session_id>`), `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "productId": "your_valid_product_object_id", // Must be valid 24-char hex
        "variantId": "your_valid_variant_object_id", // Must be valid 24-char hex
        "quantity": 1
    }
    ```
*   **Expected Response (200 OK):** Updated cart object.
    ```json
    {
        "status": "success",
        "message": "Item added to cart successfully.",
        "data": {
            "cart": {
                // ... updated cart structure ...
                "items": [
                    {
                        "cartItemId": "some_newly_generated_cart_item_id", // IMPORTANT
                        "productId": "...",
                        "variantId": "...",
                        "name": "Product Name (from mock/service)",
                        "variantName": "Variant Name (from mock/service)",
                        "image": "image_url (from mock/service)",
                        "quantity": 1,
                        "priceAtAdd": 10.99 // Price when added (from mock/service)
                    }
                ],
                "totalQuantity": 1,
                "totalPrice": 10.99
                // ... other cart fields
            }
        }
    }
    ```

### 3. Update Cart Item Quantity
*   **Precondition:** Item in cart. Use `cartItemId` from previous step.
*   **Method:** `PUT`
*   **Path:** `/api/cart/items/<cartItemId_from_previous_step>`
*   **Headers:** (`Authorization: Bearer <user_token>` **OR** `X-Session-ID: <guest_session_id>`), `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "quantity": 3
    }
    ```
    *(Note: Sending `"quantity": 0` will remove the item)*
*   **Expected Response (200 OK):** Updated cart object.

### 4. Remove Item from Cart
*   **Precondition:** Item in cart. Use `cartItemId`.
*   **Method:** `DELETE`
*   **Path:** `/api/cart/items/<cartItemId_to_delete>`
*   **Headers:** `Authorization: Bearer <user_token>` **OR** `X-Session-ID: <guest_session_id>`
*   **Body:** None
*   **Expected Response (200 OK):** Updated cart object.

### 5. Clear Cart
*   **Method:** `DELETE`
*   **Path:** `/api/cart`
*   **Headers:** `Authorization: Bearer <user_token>` **OR** `X-Session-ID: <guest_session_id>`
*   **Body:** None
*   **Expected Response (200 OK):** Empty cart object.

### 6. Merge Guest Cart to User Cart
*   **Precondition:** User is logged in (has `<user_token>`), and the client knows the `sessionId` of the guest cart that needs merging.
*   **Method:** `POST`
*   **Path:** `/api/cart/merge`
*   **Headers:** `Authorization: Bearer <user_token>`, `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "sessionId": "the_guest_session_id_to_merge_from"
    }
    ```
*   **Expected Response (200 OK):** The user's cart after merging.
    ```json
    {
        "status": "success",
        "message": "Guest cart merged successfully into user cart.",
        "data": {
            "cart": {
                // ... user's cart object with items from guest cart potentially added/updated ...
                "userId": "user_object_id",
                "sessionId": null
            }
        }
    }
    ```
*   **Expected Response (400 Bad Request):** If `sessionId` is missing.
*   **Expected Response (401 Unauthorized):** If `Authorization` header is missing or invalid.

---

## B. User Discount Routes (`/api/discounts`)

### 1. Validate Discount Code
*   **Method:** `POST`
*   **Path:** `/api/discounts/validate`
*   **Headers:** `Content-Type: application/json` (Public)
*   **Body:**
    ```json
    {
        "code": "YOUR_DISCOUNT_CODE"
    }
    ```
    *(Note: Ensure the discount code exists and is active, check `admin/discounts` to create/manage codes.)*
*   **Expected Response (200 OK if valid):**
    ```json
    {
        "message": "Discount code is valid.",
        "code": "YOUR_DISCOUNT_CODE",
        "value": 10, // Example value
        "discountType": "percentage" // Example type
    }
    ```
*   **Expected Response (400/404 if invalid/not found):** Error message.

---

## C. Order Routes (`/api/orders`)

### 1. Process Checkout
*   **Precondition:** Cart must contain items (either user cart identified by token or guest cart identified by session ID).
*   **Method:** `POST`
*   **Path:** `/api/orders/checkout`
*   **Headers (User):** `Authorization: Bearer <user_token>`, `Content-Type: application/json`
*   **Headers (Guest):** `X-Session-ID: <guest_session_id>`, `Content-Type: application/json`
*   **Body (Common Structure):**
    ```json
    {
        "shippingAddress": {
            "fullName": "Test User",
            "addressLine": "123 Test St",
            "city": "Testville",
            "zip": "12345",
            "country": "Testland",
            "phoneNumber": "555-1234"
        },
        "billingAddress": { // Optional: If different from shipping
            "fullName": "Test User",
            "addressLine": "456 Billing Ave",
            "city": "Testville",
            "zip": "12345",
            "country": "Testland",
            "phoneNumber": "555-1234"
        },
        "useLoyaltyPoints": 0, // Integer: Number of points to attempt to spend (User only)
        "discountCode": "SUMMERFUN", // Optional: Discount code string
        "paymentMethod": "mock_card", // Optional: Identifier for payment method
        "orderNotes": "Please deliver after 3 PM.", // Optional
        // --- Guest Specific (only if NO Authorization header) ---
        "guestDetails": { // Required for Guests
            "email": "guest@example.com",
            "fullName": "Guest User", // Can match shippingAddress.fullName
            "sessionId": "<guest_session_id_matching_header>" // MUST match X-Session-ID header
        }
    }
    ```
    *   **Notes on Body:**
        *   `shippingAddress` is required.
        *   `billingAddress` defaults to `shippingAddress` if omitted.
        *   `useLoyaltyPoints` only applicable for authenticated users.
        *   `guestDetails` (including `sessionId`) is required *only* for guest checkouts (when no `Authorization` token is used).
*   **Expected Response (200 OK / 201 Created):** Created order object.
    ```json
    {
        // Full Order Object details, including:
        "_id": "new_order_object_id",
        "orderNumber": "ORD-XXXXXX",
        "status": "processing", // Or initial status
        "userId": "user_object_id_if_user",
        "guestId": "guest_session_id_if_guest",
        "items": [ /* ... */ ],
        "subTotalAmount": 100.00,
        "taxAmount": 8.00,
        "shippingFee": 0.00,
        "discountAmount": 10.00,
        "loyaltyPointsSpent": 50,
        "loyaltyPointsValueSpent": 5.00,
        "loyaltyPointsEarned": 8,
        "finalTotalAmount": 93.00
        // ... other fields
    }
    ```
*   **Expected Response (400 Bad Request):** If cart is empty, validation fails, stock is insufficient, etc.
*   **Expected Response (401 Unauthorized):** If `guestDetails` are missing for a guest checkout.

### 2. Get User's Order History
*   **Method:** `GET`
*   **Path:** `/api/orders/history`
*   **Headers:** `Authorization: Bearer <user_token>`
*   **Query Params (Optional):** `page`, `limit`.
*   **Example:** `/api/orders/history?page=1&limit=5`
*   **Expected Response (200 OK):**
    ```json
    {
        "orders": [ /* Array of order objects */ ],
        "currentPage": 1,
        "totalPages": 3,
        "totalOrders": 15
    }
    ```

### 3. Get User's Specific Order by ID
*   **Precondition:** Order exists for user. Use `orderId`.
*   **Method:** `GET`
*   **Path:** `/api/orders/<orderId_from_user_history>`
*   **Headers:** `Authorization: Bearer <user_token>`
*   **Expected Response (200 OK):** Specific order object.
*   **Expected Response (404 Not Found):** If order doesn't exist or doesn't belong to the user.

---

## D. Admin Order Routes (`/api/admin/orders`)

All routes require an `<admin_token>`. Set `Authorization: Bearer <admin_token>` header.

### 1. List All Orders (Admin)
*   **Method:** `GET`
*   **Path:** `/api/admin/orders`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Query Params (Optional):** `status`, `dateFrom`, `dateTo`, `userId`, `orderNumber`, `sortBy`, `sortOrder`, `page`, `limit`.
*   **Example:** `/api/admin/orders?status=processing&userId=<a_user_id>`
*   **Expected Response (200 OK):** Paginated list of orders (structure similar to user history).

### 2. Get Specific Order Details (Admin)
*   **Method:** `GET`
*   **Path:** `/api/admin/orders/<any_orderId>`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Expected Response (200 OK):** Specific order object.

### 3. Update Order Status (Admin)
*   **Method:** `PUT`
*   **Path:** `/api/admin/orders/<any_orderId>/status`
*   **Headers:** `Authorization: Bearer <admin_token>`, `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "status": "shipped",
        "notes": "Order shipped via Fedex." // Optional
    }
    ```
    *(Valid statuses: 'pending_payment', 'payment_failed', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')*
*   **Expected Response (200 OK):** Updated order object.

---

## E. Admin Discount Routes (`/api/admin/discounts`)

All routes require an `<admin_token>`. Set `Authorization: Bearer <admin_token>` header.

### 1. Create New Discount Code (Admin)
*   **Method:** `POST`
*   **Path:** `/api/admin/discounts`
*   **Headers:** `Authorization: Bearer <admin_token>`, `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "code": "NEWYEAR25",
        "description": "New Year 25% Off",
        "discountType": "percentage", // or "fixed_amount"
        "value": 25,
        "maxUsage": 100, // Optional
        "startDate": "2025-01-01T00:00:00.000Z", // Optional
        "endDate": "2025-01-31T23:59:59.000Z",   // Optional
        "minPurchaseAmount": 50, // Optional
        "isActive": true // Optional
    }
    ```
*   **Expected Response (201 Created):** Created discount object.

### 2. Get All Discount Codes (Admin)
*   **Method:** `GET`
*   **Path:** `/api/admin/discounts`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Expected Response (200 OK):** Array of discount objects.

### 3. Get Specific Discount by ID (Admin)
*   **Method:** `GET`
*   **Path:** `/api/admin/discounts/<discount_object_id>`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Expected Response (200 OK):** The specific discount object.
*   **Expected Response (404 Not Found):** If discount with that ID doesn't exist.

### 4. Update Discount (Admin)
*   **Method:** `PUT`
*   **Path:** `/api/admin/discounts/<discount_object_id>`
*   **Headers:** `Authorization: Bearer <admin_token>`, `Content-Type: application/json`
*   **Body:** (Provide fields you want to update)
    ```json
    {
        "description": "Updated New Year Special",
        "value": 30,
        "isActive": false
    }
    ```
*   **Expected Response (200 OK):** The updated discount object.
*   **Expected Response (404 Not Found):** If discount with that ID doesn't exist.
*   **Expected Response (400 Bad Request):** If validation fails.

### 5. Delete Discount Code (Admin)
*   **Method:** `DELETE`
*   **Path:** `/api/admin/discounts/<discount_object_id>`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Expected Response (200 OK / 204 No Content):** Success message or empty body.

---

## F. User Loyalty Routes (`/api/orders/loyalty`)

These routes allow authenticated users to view their loyalty point balance and history.

All routes require a `<user_token>`. Set `Authorization: Bearer <user_token>` header.

### 1. Get Loyalty Point Balance
*   **Method:** `GET`
*   **Path:** `/api/orders/loyalty/balance`
*   **Headers:** `Authorization: Bearer <user_token>`
*   **Body:** None
*   **Expected Response (200 OK):**
    ```json
    {
        "balance": 150 // Example balance
    }
    ```
*   **Expected Response (401 Unauthorized):** If token is missing or invalid.

### 2. Get Loyalty Transaction History
*   **Method:** `GET`
*   **Path:** `/api/orders/loyalty/history`
*   **Headers:** `Authorization: Bearer <user_token>`
*   **Query Params (Optional):**
    *   `page` (e.g., `1`, `2`, ...)
    *   `limit` (e.g., `10`, `20`, ...)
*   **Example:** `/api/orders/loyalty/history?page=1&limit=5`
*   **Body:** None
*   **Expected Response (200 OK):**
    ```json
    {
        "transactions": [
            {
                "_id": "tx_object_id_1",
                "loyaltyAccountId": "account_object_id",
                "userId": "user_object_id",
                "orderId": "related_order_object_id", // If applicable
                "pointsChange": 10,
                "type": "earned", // earned, spent, reversal, correction_add, etc.
                "description": "Points earned for order ORD-XXXXXX",
                "monetaryValue": null, // Or value if type is spent/reversal_spent
                "transactionDate": "2025-05-08T..."
            },
            {
                "_id": "tx_object_id_2",
                "loyaltyAccountId": "account_object_id",
                "userId": "user_object_id",
                "orderId": "related_order_object_id_2", // If applicable
                "pointsChange": -50,
                "type": "spent",
                "description": "Points spent for order ORD-YYYYYY. Value: $5.00",
                "monetaryValue": 5.00,
                "transactionDate": "2025-05-07T..."
            }
            // ... more transactions
        ],
        "currentPage": 1,
        "totalPages": 2,
        "totalTransactions": 15
    }
    ```
*   **Expected Response (401 Unauthorized):** If token is missing or invalid.

---

## G. Admin Loyalty Routes (`/api/admin/loyalty`)

These routes allow administrators to directly manage user loyalty points.

All routes require an `<admin_token>`. Set `Authorization: Bearer <admin_token>` header.

### 1. Adjust User Loyalty Points
*   **Method:** `POST`
*   **Path:** `/api/admin/loyalty/adjust`
*   **Headers:** `Authorization: Bearer <admin_token>`, `Content-Type: application/json`
*   **Body:**
    ```json
    {
        "targetUserId": "user_object_id_to_adjust", // Must be a valid 24-char hex ObjectId
        "pointsChange": -50, // Integer: Positive to add, negative to deduct. Cannot be 0.
        "reason": "Manual correction for missed promotion." // Required, min 5 chars.
    }
    ```
*   **Expected Response (200 OK):**
    ```json
    {
        "status": "success",
        "message": "Successfully adjusted points for user <targetUserId> by -50.",
        "data": {
            "newBalance": 100, // The user's new balance after adjustment
            "transactionId": "new_loyalty_transaction_object_id"
        }
    }
    ```
*   **Expected Response (400 Bad Request):** If validation fails (invalid userId, pointsChange is 0 or not integer, reason missing/too short).
*   **Expected Response (401 Unauthorized):** If admin token is missing/invalid.
*   **Expected Response (403 Forbidden):** If token is valid but user is not an admin.
*   **Expected Response (404 Not Found):** If `targetUserId` does not correspond to an existing loyalty account (though the service creates one if missing, this might indicate the ID itself was wrong).

---
This guide should help in thoroughly testing the order-service API. 