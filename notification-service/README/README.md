# Notification Service Integration Guide

This guide will help you connect your microservice to the Notification Service.

## What is the Notification Service?

The Notification Service is responsible for handling all outbound communications to users, primarily email notifications. It processes events from RabbitMQ, renders email templates, and delivers emails via SMTP. The service is designed to:

- Handle transactional emails related to orders, user accounts, and system events
- Support multiple email templates for different notification types
- Provide a resilient notification delivery system with error handling
- Maintain delivery logs for auditing and troubleshooting

## Integration Steps

### Step 1: Set Up RabbitMQ

The Notification Service requires RabbitMQ for message processing:

```bash
# Start RabbitMQ via Docker
docker-compose up -d rabbitmq

# Or install and run manually
# sudo apt-get install rabbitmq-server
# sudo systemctl start rabbitmq-server
```

Make sure RabbitMQ is accessible at `amqp://rabbitmq:5672` (Docker network) or `amqp://localhost:5672` (local installation).

### Step 2: Configure Notification Service Environment

Edit the `.env` file in the notification-service directory:

```
# 1. RabbitMQ Connection
RABBITMQ_URL=amqp://rabbitmq:5672

# 2. Email (SMTP) Settings
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM=your_email@gmail.com

# 3. Queue Configuration
NOTIFICATION_EXCHANGE=notifications_exchange
NOTIFICATION_QUEUE=notifications_queue
NOTIFICATION_ROUTING_KEY=email.event
RETRY_EXCHANGE=retry_exchange
RETRY_QUEUE=retry_queue
DEAD_LETTER_EXCHANGE=dlx_exchange
DEAD_LETTER_QUEUE=notifications_dlq

# 4. Service Settings
PORT=5004
NODE_ENV=development
LOG_LEVEL=info
```

⚠️ **Important**: If using Docker Compose, also check `docker-compose.yml` for overriding environment variables!

### Step 3: Configure Your Service to Send Notifications

Add these environment variables to your service's `.env` file:

```
# Notification Service Connection (via RabbitMQ)
RABBITMQ_URL=amqp://rabbitmq:5672
NOTIFICATION_EXCHANGE=notifications_exchange
NOTIFICATION_ROUTING_KEY=email.event
```

### Step 4: Implement Notification Publishing in Your Service

```javascript
// Example notification publisher in your service
const amqp = require('amqplib');

async function sendNotification(notificationType, recipientEmail, data, subjectLine = '') {
  let connection;
  try {
    // 1. Connect to RabbitMQ
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // 2. Ensure exchange exists
    await channel.assertExchange(
      process.env.NOTIFICATION_EXCHANGE,
      'direct',
      { durable: true }
    );
    
    // 3. Prepare notification payload
    const payload = {
      notificationType,
      recipientEmail,
      data,
      subjectLine
    };
    
    // 4. Publish message
    channel.publish(
      process.env.NOTIFICATION_EXCHANGE,
      process.env.NOTIFICATION_ROUTING_KEY,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    
    console.log(`Notification queued: ${notificationType} to ${recipientEmail}`);
    
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  } finally {
    // Close connection if it was established
    if (connection) {
      setTimeout(() => connection.close(), 500);
    }
  }
}

// Example usage
async function notifyUserAboutOrder(user, order) {
  await sendNotification(
    'orderConfirmation',
    user.email,
    {
      userData: {
        name: user.fullName
      },
      orderData: {
        orderId: order.orderNumber,
        orderDate: order.createdAt,
        items: order.items,
        totalAmount: order.totalAmount,
        tax: order.tax,
        shippingFee: order.shippingCost,
        discountAmount: order.discountAmount,
        finalTotalAmount: order.finalAmount,
        address: order.shippingAddress
      }
    },
    'Your Order has been Confirmed'
  );
}
```

### Step 5: Notification Templates

The service includes several pre-built templates. If you need a custom template:

1. Create your template in `notification-service/views/templates/yourTemplate.ejs`
2. Follow the EJS syntax and use the data structure you'll be sending

**Example Template Structure:**
```html
<!DOCTYPE html>
<html>
<head>
    <title><%= subject %></title>
</head>
<body>
    <h1>Hello, <%= data.user.name %></h1>
    <p>Your custom message here.</p>
    <!-- Use data properties as needed -->
    <% if (data.someProperty) { %>
      <p><%= data.someProperty %></p>
    <% } %>
</body>
</html>
```

### Step 6: Supported Notification Types

The service supports the following notification types out of the box:

1. `orderConfirmation` - When a new order is placed
2. `orderStatusUpdate` - When an order status changes
3. `userRegistrationWelcome` - When a new user registers
4. `passwordReset` - When a user requests a password reset
5. `loyaltyPointsUpdate` - When a user's loyalty points change
6. `accountStatusChange` - When a user's account status changes
7. `adminDiscountCreated` - When an admin creates a new discount code

For each type, see the [notification_testing_guide.md](./notification_testing_guide.md) for exact data structure requirements.

### Step 7: Restart Services

```bash
# Restart both services to apply changes
docker-compose restart notification-service your-service-name
```

### Step 8: Test the Integration

Use the [notification_testing_guide.md](./notification_testing_guide.md) to test your integration:

1. Test publishing messages to RabbitMQ
2. Verify email delivery
3. Check for template rendering errors

## Troubleshooting Common Issues

| Problem | Solution |
|---------|----------|
| **"Connection refused" errors with RabbitMQ** | Ensure RabbitMQ is running and accessible at the configured URL. |
| **Emails not being sent** | Check SMTP credentials and settings. For Gmail, use App Passwords instead of regular password. |
| **Template rendering errors** | Verify the data structure matches what the template expects. Check logs for specific error details. |
| **Messages going to dead-letter queue** | Inspect the message in the DLQ using RabbitMQ Management UI and fix the payload format. |
| **"Channel closed" errors** | Check if connections are being properly closed after use. |

## Monitoring

Access the RabbitMQ Management UI at http://localhost:15672 (default credentials: guest/guest) to:

1. Monitor message queues
2. Check for unprocessed messages
3. View message rates and consumer status

## Security Considerations

1. **Email Credentials**: Store SMTP credentials securely, never in code repositories
2. **Queue Access**: Configure RabbitMQ with proper access controls in production
3. **Data Protection**: Be careful not to include sensitive PII in email templates

For additional help, check the logs of the notification service using:
```bash
docker-compose logs -f notification-service
```