# Order Service Integration Guide

This guide will help you connect your microservice to the Order Service.

## What is the Order Service?

The Order Service manages shopping carts, checkout processing, orders, and loyalty points. It needs to connect with:
- **Auth Service** - For user authentication and profile data
- **Product Service** - For product validation and inventory management
- **Notification Service** - For sending order confirmations and updates

## Integration Steps

### Step 1: Set Up Your Database
Order Service requires MongoDB with replica set enabled:

```bash
# Start MongoDB with replica set flag
mongod --replSet rs0

# Initialize the replica set (only needed once)
mongo
> rs.initiate()
```

Make sure your connection string includes `?replicaSet=rs0` parameter.

### Step 2: Configure Order Service Environment

Edit the `.env` file in the order-service directory:

```
# 1. Set the correct database
MONGODB_URI=mongodb://mongo:27017/order_service_dev?replicaSet=rs0  # Development
# MONGODB_URI=mongodb://mongo:27017/order_service?replicaSet=rs0  # Production
MONGODB_DATABASE=order_service_dev

# 2. Set your service URL (use the one that applies to your service)
AUTH_SERVICE_URL=http://auth-service:5001
PRODUCT_SERVICE_URL=http://product-service:5002
NOTIFICATION_SERVICE_URL=http://notification-service:5004

# 3. Disable mock mode for your service
USE_MOCK_AUTH_SERVICE=false  # If connecting Auth Service
USE_MOCK_PRODUCT_SERVICE=false  # If connecting Product Service
USE_MOCK_NOTIFICATION_SERVICE=false  # If connecting Notification Service

# 4. Make sure other settings are configured
JWT_SECRET=your_jwt_secret_here  # Must match Auth Service secret
RABBITMQ_URL=amqp://rabbitmq:5672
```

⚠️ **Important**: If using Docker Compose, also check `docker-compose.yml` for overriding environment variables!

### Step 3: Configure Your Service to Connect to Order Service

Add these environment variables to your service's `.env` file:

```
# Order Service Connection
ORDER_SERVICE_URL=http://order-service:5003  # Use container name in Docker network
# For local development without Docker
# ORDER_SERVICE_URL=http://localhost:5003
```

Make sure your service has a proper HTTP client configured to make requests to the Order Service. For example:

```javascript
// Example configuration in your service
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:5003';

// Example function to call Order Service API
async function getOrderDetails(orderId, authToken) {
  const response = await fetch(`${ORDER_SERVICE_URL}/api/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Order Service error: ${response.status}`);
  }
  
  return await response.json();
}
```

### Step 4: Implement Required Endpoints

Choose the service you're developing and implement these endpoints:

#### For Auth Service:
```javascript
// 1. GET /api/users/:userId
// Must return: { email, fullName, ... }
app.get('/api/users/:userId', (req, res) => {
  // Implement user data retrieval
});

// 2. POST /api/auth/verify
// Must validate JWT token and return user data
app.post('/api/auth/verify', (req, res) => {
  // Implement token verification
});
```

#### For Product Service:
```javascript
// 1. POST /api/products/validate
// Must validate products exist and have sufficient stock
app.post('/api/products/validate', (req, res) => {
  // Implement product validation
});

// 2. POST /api/products/inventory/decrement
// Must decrease inventory after order
app.post('/api/products/inventory/decrement', (req, res) => {
  // Implement inventory update
});
```

#### For Notification Service:
```javascript
// Set up RabbitMQ consumer for order notifications
amqp.connect('amqp://rabbitmq:5672', (err, conn) => {
  // Connect to the notifications_queue and process messages
});
```

### Step 5: Restart Services

```bash
# Restart both services to apply changes
docker-compose restart order-service your-service-name
```

### Step 6: Test the Integration

Use the Postman collection in `/doc/postman` to test:

1. For Auth Service: Test user authentication and profile retrieval
2. For Product Service: Test product validation and inventory updates 
3. For Notification Service: Test order confirmation emails

Or run the integration tests:
```bash
npm run test:integration
```

## Troubleshooting Common Issues

| Problem | Solution |
|---------|----------|
| **"Transaction numbers are only allowed on replica set member"** | Your MongoDB isn't configured as a replica set. Follow Step 1 again. |
| **Authentication failures** | Make sure `JWT_SECRET` is identical in both Order and Auth services. |
| **"Cart is empty or not found"** | Check user ID consistency between services. |
| **API endpoints return unexpected errors** | Verify your endpoints match the expected format exactly. |
| **Services can't communicate** | Check network settings, especially in Docker environment. |