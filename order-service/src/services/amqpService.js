const amqp = require('amqplib');
const logger = require('../config/logger'); // Use logger

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'notifications_exchange';
const EXCHANGE_TYPE = 'direct';
const NOTIFICATION_ROUTING_KEY = 'order.confirmed';

let connection = null;
let channel = null;
let isConnecting = false; // Prevent concurrent connection attempts
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function resetConnectionState() {
    connection = null;
    channel = null;
    isConnecting = false;
    // Don't reset retryAttempts here, let the connect function handle it
}

async function connectRabbitMQ(isRetry = false) {
    if (channel && connection) {
        logger.info('RabbitMQ already connected.');
        retryAttempts = 0; // Reset attempts on successful connection
        isConnecting = false;
        return; // Already connected
    }
    if (isConnecting) {
        logger.info('RabbitMQ connection attempt already in progress.');
        return;
    }

    isConnecting = true;

    if (isRetry) {
        retryAttempts++;
        if (retryAttempts > MAX_RETRY_ATTEMPTS) {
            logger.error(`RabbitMQ connection failed after ${MAX_RETRY_ATTEMPTS} attempts. Giving up.`);
            isConnecting = false;
            retryAttempts = 0; // Reset for future manual attempts if needed
            // Potentially implement circuit breaker logic here
            return;
        }
        // Exponential backoff
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * (2 ** (retryAttempts - 1)), MAX_RETRY_DELAY_MS);
        logger.info(`RabbitMQ connection attempt ${retryAttempts}/${MAX_RETRY_ATTEMPTS}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
        logger.info(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}`, { metadata: { attempt: retryAttempts + 1 } } );
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // Assert the exchange exists (or create it if it doesn't)
        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });

        logger.info('RabbitMQ connected and exchange asserted successfully.');
        retryAttempts = 0; // Reset attempts on success
        isConnecting = false;

        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', { metadata: { error: err } });
            resetConnectionState();
            // Start retry process
            if (!isConnecting) {
                 connectRabbitMQ(true);
            }
        });
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
            resetConnectionState();
            // Start retry process
            if (!isConnecting) {
                 connectRabbitMQ(true);
            }
        });

    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', { metadata: { error: error } });
        isConnecting = false; // Allow retry
        // Trigger retry
        connectRabbitMQ(true);
    }
}

async function publishNotification(payload) {
    if (!channel) {
        logger.error('Cannot publish message: RabbitMQ channel is not available.', { metadata: { orderId: payload?.orderData?._id } });
        // Attempt a quick reconnect if not already connecting, but don't block indefinitely
        if (!isConnecting) {
            logger.info('Attempting immediate reconnect before publishing...');
            await connectRabbitMQ(); // Try one immediate reconnect
        }
        if (!channel) {
            logger.error('Publish failed: RabbitMQ channel still not available after quick reconnect attempt.', { metadata: { orderId: payload?.orderData?._id } });
             return; // Or throw error / queue locally
        }
    }

    try {
        const message = Buffer.from(JSON.stringify(payload));
        // Publish the message to the exchange with the routing key
        channel.publish(EXCHANGE_NAME, NOTIFICATION_ROUTING_KEY, message, {
            persistent: true // Make message persistent (stored on disk)
        });
        logger.info(`Order notification published to RabbitMQ`, { metadata: { orderId: payload.orderData?._id || 'unknown' } });
    } catch (error) {
        logger.error('Failed to publish notification to RabbitMQ:', { metadata: { orderId: payload?.orderData?._id, error: error } });
        // Handle error - maybe log to a failed queue or database?
    }
}

// Initial connection attempt
connectRabbitMQ();

module.exports = {
    publishNotification,
    connectRabbitMQ // Expose connect if needed elsewhere, though it runs on load
}; 