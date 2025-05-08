# Notification Service Testing Guide

This guide provides detailed instructions on how to test the notification service, which handles email notifications via RabbitMQ message queue.

## General Prerequisites

1. **Services Running:** Ensure `notification-service` and `rabbitmq` are running (e.g., via `docker-compose up -d notification-service rabbitmq`).
2. **RabbitMQ Management UI:** Access at `http://localhost:15672` (unless configured differently).
   - Default credentials: Username: `guest`, Password: `guest`
3. **Email Configuration:** The notification service is already configured with Gmail SMTP in the `.env` file:
   ```
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SECURE=false
   MAIL_USER=reainz307@gmail.com
   MAIL_PASS=uzyi lixs jrco yyie
   MAIL_FROM=reainz307@gmail.com
   ```

## A. Testing Notification Templates

The notification service supports several email templates. To test each template, you need to send a message to the RabbitMQ exchange with the appropriate routing key and payload.

### General Message Structure

All notifications follow this general JSON structure:

```json
{
  "notificationType": "templateName",
  "recipientEmail": "thekings30799@gmail.com",
  "subjectLine": "Your Custom Subject Line", // Optional, defaults to notificationType
  "data": {
    // Template-specific data keys and values
  }
}
```

### How to Test via RabbitMQ Management UI

1. **Access the RabbitMQ Management UI:** Open `http://localhost:15672` and login.
2. **Navigate to the Exchange:** Click on the "Exchanges" tab, then find and click on `notifications_exchange`.
3. **Publish a Message:**
   - **Routing key:** `email.event`
   - **Payload:** Copy and paste a JSON message from the examples below
   - **Payload encoding:** Select "String (default)"
   - Click "Publish Message"
4. **Verify:** Check the logs of the notification service and check the test email inbox (`thekings30799@gmail.com`).

## B. Available Templates and Test Payloads

### 1. Order Confirmation
*   **Template:** `orderConfirmation.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "orderConfirmation",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Your Order has been Confirmed",
      "data": {
        "userData": {
          "name": "John Doe"
        },
        "orderData": {
          "orderId": "ORD-123456",
          "orderDate": "2025-05-08T14:30:00.000Z",
          "items": [
            {
              "name": "Product 1",
              "quantity": 2,
              "price": 24.99
            },
            {
              "name": "Product 2",
              "quantity": 1,
              "price": 19.99
            }
          ],
          "totalAmount": 72.97,
          "tax": 3.00,
          "shippingFee": 0,
          "discountAmount": 0,
          "finalTotalAmount": 69.97,
          "address": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zipCode": "12345",
            "country": "United States"
          }
        }
      }
    }
    ```

### 2. Order Status Update
*   **Template:** `orderStatusUpdate.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "orderStatusUpdate",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Your Order Status has Changed",
      "data": {
        "orderNumber": "ORD-123456",
        "orderDate": "2025-05-08T14:30:00.000Z",
        "customer": {
          "name": "John Doe"
        },
        "newStatus": "shipped",
        "previousStatus": "processing",
        "trackingNumber": "1Z999AA10123456784",
        "carrier": "UPS",
        "estimatedDelivery": "2025-05-12",
        "statusUpdateTime": "2025-05-09T10:15:00.000Z",
        "additionalInfo": "Your package is on its way!"
      }
    }
    ```

### 3. User Registration Welcome
*   **Template:** `userRegistrationWelcome.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "userRegistrationWelcome",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Welcome to Our Platform!",
      "data": {
        "user": {
          "name": "Jane Doe",
          "email": "thekings30799@gmail.com"
        },
        "registrationDate": "2025-05-08T09:15:00.000Z",
        "verificationUrl": "https://example.com/verify?token=abc123"
      }
    }
    ```

### 4. Password Reset
*   **Template:** `passwordReset.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "passwordReset",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Password Reset Request",
      "data": {
        "user": {
          "name": "John Doe"
        },
        "resetUrl": "https://example.com/reset-password?token=xyz789",
        "expiryTime": "2025-05-08T15:30:00.000Z",
        "requestedAt": "2025-05-08T14:30:00.000Z",
        "requestIp": "192.168.1.1"
      }
    }
    ```

### 5. Loyalty Points Update
*   **Template:** `loyaltyPointsUpdate.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "loyaltyPointsUpdate",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Your Loyalty Points Have Changed",
      "data": {
        "user": {
          "name": "Sarah Smith"
        },
        "pointsChange": 50,
        "changeType": "earned", // "earned", "spent", "expired", "adjusted"
        "newBalance": 250,
        "orderNumber": "ORD-123456", // Optional, if related to an order
        "monetaryValue": 5.00, // Optional, if points have a monetary value
        "reason": "Points earned for your recent purchase",
        "transactionDate": "2025-05-08T11:45:00.000Z"
      }
    }
    ```

### 6. Account Status Change
*   **Template:** `accountStatusChange.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "accountStatusChange",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Important: Your Account Status Has Changed",
      "data": {
        "user": {
          "name": "Michael Johnson"
        },
        "newStatus": "verified", // "verified", "suspended", "locked", etc.
        "previousStatus": "unverified",
        "reason": "Email verification completed",
        "effectiveDate": "2025-05-08T13:20:00.000Z",
        "additionalInfo": "You now have full access to all features.",
        "contactInfo": "support@example.com"
      }
    }
    ```

### 7. Admin Discount Created
*   **Template:** `adminDiscountCreated.ejs`
*   **Message Payload:**
    ```json
    {
      "notificationType": "adminDiscountCreated",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "New Discount Code Created",
      "data": {
        "admin": {
          "name": "Admin User"
        },
        "discount": {
          "code": "SUMMER2025",
          "description": "Summer Sale 2025",
          "discountType": "percentage",
          "value": 25,
          "startDate": "2025-06-01T00:00:00.000Z",
          "endDate": "2025-06-30T23:59:59.000Z",
          "maxUsage": 100,
          "minPurchaseAmount": 50,
          "isActive": true
        },
        "createdAt": "2025-05-08T15:45:00.000Z"
      }
    }
    ```

### 8. Default Fallback Template
*   **Template:** `defaultFallback.ejs`
*   **Description:** This template provides a clean, user-friendly fallback when a specific template doesn't exist. The fallback is designed to present only essential information without technical details.
*   **Message Payload:**
    ```json
    {
      "notificationType": "nonExistentTemplate",
      "recipientEmail": "thekings30799@gmail.com",
      "subjectLine": "Notification",
      "data": {
        "user": {
          "name": "Test User"
        },
        "message": "This is a test message for the default fallback template",
        "timestamp": "2025-05-08T16:00:00.000Z"
      }
    }
    ```
*   **Expected Result:** The user will receive a clean email with:
    - A greeting with their name
    - The message content
    - A formatted date
    - No error messages or technical details about missing templates
    - No raw JSON data displayed

## C. Troubleshooting

### 1. Messages Not Being Processed
* **Check RabbitMQ Connection:** Ensure the notification service is connected to RabbitMQ. Check logs for connection errors.
* **Check Queue:** Verify that the `notifications_queue` exists and is bound to the exchange with the correct routing key.
* **Dead-Letter Queue:** If messages are being rejected, check the `notifications_dlq` for failed messages.

### 2. Email Not Being Sent
* **Check SMTP Configuration:** Verify the SMTP settings in the `.env` file are correct.
* **Gmail Security:** Make sure the Gmail account allows "Less secure apps" or is using an app password.
* **Check Logs:** Look for any errors in the notification service logs.

### 3. Template Rendering Errors
* **Invalid Data:** Ensure your message payload contains all the required data for the template.
* **Template Syntax:** Check the template file for syntax errors.
* **Check Logs:** The logs should indicate which template failed and why.

## D. Testing Script (Optional)

You can create a simple script to test sending messages to RabbitMQ without using the Management UI:

```javascript
// test-notification.js
const amqp = require('amqplib');

async function sendTestMessage() {
  const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
  const channel = await connection.createChannel();
  
  const exchange = 'notifications_exchange';
  const routingKey = 'email.event';
  
  // Example payload - replace with one from the guide
  const payload = {
    notificationType: "orderConfirmation",
    recipientEmail: "thekings30799@gmail.com",
    subjectLine: "Your Order has been Confirmed",
    data: {
      userData: {
        name: "John Doe"
      },
      orderData: {
        orderId: "ORD-123456",
        orderDate: "2025-05-08T14:30:00.000Z",
        items: [
          {
            name: "Product 1",
            quantity: 2,
            price: 24.99
          }
        ],
        totalAmount: 52.98,
        tax: 3.00,
        shippingFee: 0,
        discountAmount: 0,
        finalTotalAmount: 49.98,
        address: {
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          zipCode: "12345",
          country: "United States"
        }
      }
    }
  };
  
  await channel.assertExchange(exchange, 'direct', { durable: true });
  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
  
  console.log(" [x] Sent test message");
  
  setTimeout(() => {
    connection.close();
    process.exit(0);
  }, 500);
}

sendTestMessage().catch(console.error);
```

To use this script:
1. Install dependencies: `npm install amqplib`
2. Run: `node test-notification.js`

## F. Verifying Email Delivery

After sending a test message, you should:

1. Check the notification service logs for success messages.
2. Check the test email inbox (`thekings30799@gmail.com`) for the test emails.

This guide should help in thoroughly testing the notification-service email templates and functionality using your configured Gmail account. 