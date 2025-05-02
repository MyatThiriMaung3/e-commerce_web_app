const amqp = require('amqplib');
const logger = require('../config/logger'); // Use logger
const emailService = require('./emailService');
const ejs = require('ejs');
const path = require('path');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'notifications_exchange';
const EXCHANGE_TYPE = 'direct';
const QUEUE_NAME = 'order_confirmation_queue';
const BINDING_KEY = 'order.confirmed';

// Define DLX and DLQ names
const DLX_NAME = 'notifications_dlx'; // Dead-Letter Exchange
const DLQ_NAME = 'order_confirmation_dlq'; // Dead-Letter Queue

let connection = null;
let channel = null;
let isConnecting = false; // Prevent concurrent connection attempts
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function resetConnectionState() {
    channel = null;
    connection = null;
    isConnecting = false;
    // Don't reset retryAttempts here, let the connect function handle it
}

// --- Handler for processing incoming messages ---
async function handleOrderConfirmation(msg) {
    if (!msg) return false; // No message

    let payload;
    let orderIdForLog = 'unknown'; // Initialize here for catch block access
    try {
        payload = JSON.parse(msg.content.toString());
        const { recipientEmail, orderData, userData } = payload;
        orderIdForLog = orderData?._id || orderData?.orderId || 'unknown';
        logger.info(`Received order confirmation message`, { metadata: { orderId: orderIdForLog, payload } });

        // Basic validation
        if (!recipientEmail || !orderData || !userData) {
            logger.error('Invalid message payload: Missing required fields', { metadata: { orderId: orderIdForLog, payload } });
            return true; // Acknowledge message - cannot process, don't requeue
        }

        // Render the EJS template
        logger.debug(`Rendering EJS template for order`, { metadata: { orderId: orderIdForLog } });
        const templatePath = path.join(__dirname, '..', 'views', 'templates', 'orderConfirmation.ejs');
        const htmlContent = await ejs.renderFile(templatePath, { orderData, userData });
        logger.debug(`EJS template rendered successfully`, { metadata: { orderId: orderIdForLog } });

        // Define subject and text content
        const subject = `Order Confirmation - #${orderIdForLog}`;
        const textContent = `Hello ${userData.fullName || 'Customer'},\n\nThank you for your order (#${orderIdForLog})...`; // Simplified text

        // Send the email
        // emailService will log its attempts/errors
        await emailService.sendEmail(recipientEmail, subject, textContent, htmlContent);
        logger.info(`Order confirmation email processing completed successfully`, { metadata: { orderId: orderIdForLog, recipientEmail } });

        return true; // Indicate successful processing

    } catch (error) {
        logger.error('Error processing order confirmation message:', {
             metadata: {
                 orderId: orderIdForLog,
                 error: error,
                 payload: payload // Log the payload that caused the error
             }
            });
        // Indicate failure to trigger nack (and DLQ if configured)
        logger.warn(`Processing failed for order, message will be sent to DLQ.`, { metadata: { orderId: orderIdForLog } });
        return false;
    }
}

// --- AMQP Connection and Consumer Setup ---
async function startConsumer(isRetry = false) {
    if (channel && connection) {
        logger.info('RabbitMQ consumer already connected and channel established.');
        retryAttempts = 0; // Reset attempts on success
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
            return;
        }
        // Exponential backoff
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * (2 ** (retryAttempts - 1)), MAX_RETRY_DELAY_MS);
        logger.info(`RabbitMQ connection attempt ${retryAttempts}/${MAX_RETRY_ATTEMPTS}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
        logger.info(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}`, { metadata: { attempt: retryAttempts + 1 } });
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', { metadata: { error: err } });
            resetConnectionState();
            // Start retry process
            if (!isConnecting) {
                startConsumer(true);
            }
        });
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
            resetConnectionState();
            // Start retry process
            if (!isConnecting) {
                startConsumer(true);
            }
        });

        logger.info('RabbitMQ connected.');

        // Assert Exchange (idempotent)
        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
        logger.info(`Exchange asserted.`, { metadata: { name: EXCHANGE_NAME, type: EXCHANGE_TYPE } });

        // --- DLX and DLQ Setup ---
        await channel.assertExchange(DLX_NAME, 'fanout', { durable: true });
        logger.info(`Dead-Letter Exchange asserted.`, { metadata: { name: DLX_NAME } });

        await channel.assertQueue(DLQ_NAME, { durable: true });
        logger.info(`Dead-Letter Queue asserted.`, { metadata: { name: DLQ_NAME } });

        await channel.bindQueue(DLQ_NAME, DLX_NAME, '');
        logger.info(`Dead-Letter Queue bound to DLX.`, { metadata: { queue: DLQ_NAME, exchange: DLX_NAME } });
        // --- End DLX/DLQ Setup ---

        // Assert Main Queue with DLX configuration
        const queueArgs = {
            durable: true,
            arguments: { 'x-dead-letter-exchange': DLX_NAME }
        };
        await channel.assertQueue(QUEUE_NAME, queueArgs);
        logger.info(`Main Queue asserted with DLX routing.`, { metadata: { name: QUEUE_NAME, args: queueArgs.arguments } });

        // Bind Queue to Exchange
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);
        logger.info(`Main Queue bound to main exchange.`, { metadata: { queue: QUEUE_NAME, exchange: EXCHANGE_NAME, key: BINDING_KEY } });

        // Set prefetch count
        channel.prefetch(1);
        logger.info('Consumer prefetch count set', { metadata: { count: 1 } });

        // Start consuming messages
        logger.info(`Waiting for messages in queue '${QUEUE_NAME}'...`);
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                logger.debug('Received message from queue', { metadata: { queue: QUEUE_NAME } });
                const success = await handleOrderConfirmation(msg);
                if (success) {
                    channel.ack(msg);
                    logger.debug('Message acknowledged.');
                } else {
                    channel.nack(msg, false, false); // requeue = false
                    // Log handled within handleOrderConfirmation
                    // logger.warn('Message processing failed, nacked and routed to DLQ.');
                }
            }
        });

        logger.info('RabbitMQ Consumer started successfully and waiting for messages.');
        retryAttempts = 0; // Reset attempts on success
        isConnecting = false;

    } catch (error) {
        logger.error('Failed to start RabbitMQ consumer:', { metadata: { error: error } });
        isConnecting = false; // Allow retry
        // Trigger retry
        startConsumer(true);
    }
}

async function closeConnection() {
    logger.info('Closing RabbitMQ connection...');
    try {
        if (channel) {
            await channel.close();
            logger.info('RabbitMQ channel closed.');
        }
        if (connection) {
            await connection.close();
            logger.info('RabbitMQ connection closed.');
        }
    } catch (error) {
        logger.error('Error closing RabbitMQ connection:', { metadata: { error: error } });
    }
    resetConnectionState();
}

module.exports = {
    startConsumer,
    closeConnection
}; 