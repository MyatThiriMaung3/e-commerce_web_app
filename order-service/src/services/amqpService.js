const amqp = require('amqplib');
const logger = require('../config/logger');
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const NOTIFICATION_EXCHANGE = process.env.NOTIFICATION_EXCHANGE || 'notifications_exchange';
const NOTIFICATION_QUEUE = process.env.NOTIFICATION_QUEUE || 'notifications_queue'; // Main queue for notifications
const NOTIFICATION_ROUTING_KEY = process.env.NOTIFICATION_ROUTING_KEY || 'email.notify'; // Routing key for direct exchange or topic

let connection = null;
let channel = null;

/**
 * Connects to RabbitMQ and sets up the exchange and queue if not already done.
 */
const connectRabbitMQ = async () => {
    if (channel && connection) {
        return;
    }
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        logger.info('AMQP: Connected to RabbitMQ successfully.');

        channel = await connection.createChannel();
        logger.info('AMQP: Channel created.');

        // Assert an exchange (e.g., direct or topic) for notifications
        // Using a direct exchange for simplicity here. A topic exchange would be more flexible.
        await channel.assertExchange(NOTIFICATION_EXCHANGE, 'direct', { durable: true });
        logger.info(`AMQP: Exchange '${NOTIFICATION_EXCHANGE}' asserted.`);

        // Assert a queue for notifications
        await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
        logger.info(`AMQP: Queue '${NOTIFICATION_QUEUE}' asserted.`);

        // Bind the queue to the exchange with a routing key
        await channel.bindQueue(NOTIFICATION_QUEUE, NOTIFICATION_EXCHANGE, NOTIFICATION_ROUTING_KEY);
        logger.info(`AMQP: Queue '${NOTIFICATION_QUEUE}' bound to exchange '${NOTIFICATION_EXCHANGE}' with key '${NOTIFICATION_ROUTING_KEY}'.`);

        connection.on('error', (err) => {
            logger.error('AMQP: Connection error', err);
            connection = null; // Reset connection
            channel = null;
            // Implement reconnection logic if desired
        });
        connection.on('close', () => {
            logger.warn('AMQP: Connection closed. Reconnecting...');
            connection = null;
            channel = null;
            // setTimeout(connectRabbitMQ, 5000); // Simple retry
        });

    } catch (error) {
        logger.error('AMQP: Failed to connect or setup RabbitMQ:', error);
        connection = null;
        channel = null;
        // Rethrow or handle appropriately, perhaps retry connection
        throw error;
    }
};

/**
 * Publishes a notification message to the RabbitMQ exchange.
 * The message should follow the standardized format: { notificationType, recipientEmail, data }
 * @param {string} notificationType - Type of the notification (e.g., 'orderConfirmation', 'statusUpdate').
 * @param {object} payload - The payload containing { recipientEmail, data }.
 * @returns {Promise<void>}
 */
const publishNotification = async (notificationType, payload) => {
    if (!notificationType || !payload || !payload.recipientEmail || !payload.data) {
        logger.error('AMQP: Invalid notification payload. Required: notificationType, recipientEmail, data.', { notificationType, payload });
        throw new Error('Invalid notification payload. Required fields: notificationType, recipientEmail, data.');
    }

    if (!channel) {
        logger.warn('AMQP: Channel not available. Attempting to reconnect...');
        await connectRabbitMQ(); // Attempt to reconnect if channel is lost
        if (!channel) {
            logger.error('AMQP: Failed to publish notification. Channel is not available after reconnect attempt.');
            throw new Error('AMQP channel is not available. Cannot publish notification.');
        }
    }

    const message = {
        notificationType,
        recipientEmail: payload.recipientEmail,
        data: payload.data,
        publishedAt: new Date().toISOString(),
    };

    try {
        // Publish to the exchange with the specific routing key
        // The exchange will route it to queues bound with this key (i.e., NOTIFICATION_QUEUE)
        channel.publish(
            NOTIFICATION_EXCHANGE,
            NOTIFICATION_ROUTING_KEY,
            Buffer.from(JSON.stringify(message)),
            { persistent: true } // Ensure message is persistent
        );
        logger.info(`AMQP: Message published to exchange '${NOTIFICATION_EXCHANGE}' with key '${NOTIFICATION_ROUTING_KEY}'. Type: ${notificationType}`, {
             metadata: { recipient: payload.recipientEmail, type: notificationType }
        });
    } catch (error) {
        logger.error('AMQP: Failed to publish message:', error);
        // Potentially implement retry logic or dead-lettering here from the publisher side if critical
        // For now, just rethrow
        throw error;
    }
};

/**
 * Closes the RabbitMQ connection and channel.
 */
const closeRabbitMQ = async () => {
    try {
        if (channel) {
            await channel.close();
            logger.info('AMQP: Channel closed.');
        }
        if (connection) {
            await connection.close();
            logger.info('AMQP: Connection closed.');
        }
    } catch (error) {
        logger.error('AMQP: Error closing RabbitMQ connection:', error);
    } finally {
        channel = null;
        connection = null;
    }
};

// Initialize connection on load (optional, can be called explicitly)
// connectRabbitMQ().catch(err => logger.error("Initial AMQP connection failed:", err)); // Commented out
// connectRabbitMQ().catch(err => console.error("Initial AMQP connection failed:", err)); // TEMP if uncommenting the above

module.exports = {
    connectRabbitMQ,
    publishNotification,
    closeRabbitMQ,
}; 