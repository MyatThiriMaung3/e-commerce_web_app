const amqp = require('amqplib');
const logger = require('../config/logger');
const emailService = require('./emailService');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises; // Using promises version of fs

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'notifications_exchange'; // Central exchange for all notifications
const EXCHANGE_TYPE = 'direct'; // Can be 'direct' or 'topic' depending on routing needs
const QUEUE_NAME = 'notifications_queue';    // Generic queue for this service
const BINDING_KEY = 'email.event';          // Generic binding key

const DLX_NAME = 'notifications_dlx';       // Dead-Letter Exchange for all notifications
const DLQ_NAME = 'notifications_dlq';       // Dead-Letter Queue for all notifications

let connection = null;
let channel = null;
let isConnecting = false;
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

function resetConnectionState() {
    channel = null;
    connection = null;
    isConnecting = false;
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// --- Generic Handler for processing incoming notification messages ---
async function handleNotificationEvent(msg) {
    if (!msg) return false; // No message

    let payload;
    let notificationTypeForLog = 'unknown';
    let recipientForLog = 'unknown';

    try {
        payload = JSON.parse(msg.content.toString());
        const { notificationType, recipientEmail, data, subjectLine } = payload;

        notificationTypeForLog = notificationType || 'unknown';
        recipientForLog = recipientEmail || 'unknown';

        logger.info(`Received notification event`, { metadata: { type: notificationTypeForLog, recipient: recipientForLog, payload } });

        // Basic validation
        if (!notificationType || !recipientEmail || !data) {
            logger.error('Invalid message payload: Missing notificationType, recipientEmail, or data', { 
                metadata: { type: notificationTypeForLog, recipient: recipientForLog, payload } 
            });
            return true; // Acknowledge message - cannot process, don't requeue
        }

        let htmlContent;
        let templateUsed = notificationType;
        const specificTemplatePath = path.join(__dirname, '..', 'views', 'templates', `${notificationType}.ejs`);
        const fallbackTemplatePath = path.join(__dirname, '..', 'views', 'templates', 'defaultFallback.ejs');

        logger.debug(`Attempting to render template for type: ${notificationType}`, { metadata: { recipient: recipientForLog } });

        if (await fileExists(specificTemplatePath)) {
            try {
                htmlContent = await ejs.renderFile(specificTemplatePath, { ...data, notificationType });
                logger.info(`Rendered specific template: ${notificationType}.ejs`, { metadata: { recipient: recipientForLog } });
            } catch (renderError) {
                logger.warn(`Failed to render specific template ${notificationType}.ejs. Falling back to default.`, { 
                    metadata: { recipient: recipientForLog, error: renderError.message }
                });
                templateUsed = 'defaultFallback';
                // Pass original notificationType and data to the fallback template
                htmlContent = await ejs.renderFile(fallbackTemplatePath, { notificationType, data });
                logger.info(`Rendered defaultFallback.ejs due to render error in specific template.`, { metadata: { recipient: recipientForLog } });
            }
        } else {
            logger.warn(`Specific template not found: ${notificationType}.ejs. Falling back to default.`, { 
                metadata: { recipient: recipientForLog }
            });
            templateUsed = 'defaultFallback';
            htmlContent = await ejs.renderFile(fallbackTemplatePath, { notificationType, data });
            logger.info(`Rendered defaultFallback.ejs due to missing specific template.`, { metadata: { recipient: recipientForLog } });
        }

        const subject = subjectLine || `Notification: ${notificationType.replace(/([A-Z])/g, ' $1').trim()}`; // Auto-generate subject if not provided
        // Basic text content (can be improved or made part of the payload if needed)
        const textContent = `You have a new notification of type: ${notificationType}. Please check the HTML version for details.`;

        await emailService.sendEmail(recipientEmail, subject, textContent, htmlContent);
        logger.info(`Notification email processing completed successfully`, { 
            metadata: { type: notificationType, recipient: recipientEmail, templateUsed }
        });

        return true; // Indicate successful processing

    } catch (error) {
        logger.error('Error processing notification event:', {
             metadata: {
                 type: notificationTypeForLog,
                 recipient: recipientForLog,
                 error: error.message, // Log only message for brevity, stack is in higher level handler
                 payload: payload 
             }
            });
        logger.warn(`Processing failed for notification, message will be sent to DLQ.`, { 
            metadata: { type: notificationTypeForLog, recipient: recipientForLog }
        });
        return false;
    }
}

// --- AMQP Connection and Consumer Setup ---
async function startConsumer(isRetry = false) {
    if (channel && connection) {
        logger.info('RabbitMQ consumer already connected and channel established.');
        retryAttempts = 0;
        isConnecting = false;
        return;
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
            retryAttempts = 0;
            return;
        }
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * (2 ** (retryAttempts - 1)), MAX_RETRY_DELAY_MS);
        logger.info(`RabbitMQ connection attempt ${retryAttempts}/${MAX_RETRY_ATTEMPTS}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
        logger.info(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}`, { metadata: { attempt: retryAttempts + 1 } });
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', { metadata: { error: err.message } });
            resetConnectionState();
            if (!isConnecting) {
                startConsumer(true);
            }
        });
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
            resetConnectionState();
            if (!isConnecting) {
                startConsumer(true);
            }
        });

        logger.info('RabbitMQ connected.');

        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
        logger.info(`Exchange asserted.`, { metadata: { name: EXCHANGE_NAME, type: EXCHANGE_TYPE } });

        await channel.assertExchange(DLX_NAME, 'fanout', { durable: true }); // DLX type is usually fanout
        logger.info(`Dead-Letter Exchange asserted.`, { metadata: { name: DLX_NAME } });

        await channel.assertQueue(DLQ_NAME, { durable: true });
        logger.info(`Dead-Letter Queue asserted.`, { metadata: { name: DLQ_NAME } });

        await channel.bindQueue(DLQ_NAME, DLX_NAME, ''); // No routing key needed for fanout DLX
        logger.info(`Dead-Letter Queue bound to DLX.`, { metadata: { queue: DLQ_NAME, exchange: DLX_NAME } });

        const queueArgs = {
            durable: true,
            arguments: { 'x-dead-letter-exchange': DLX_NAME }
        };
        await channel.assertQueue(QUEUE_NAME, queueArgs);
        logger.info(`Main Queue asserted with DLX routing.`, { metadata: { name: QUEUE_NAME, args: queueArgs.arguments } });

        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);
        logger.info(`Main Queue bound to main exchange.`, { metadata: { queue: QUEUE_NAME, exchange: EXCHANGE_NAME, key: BINDING_KEY } });

        channel.prefetch(1);
        logger.info('Consumer prefetch count set', { metadata: { count: 1 } });

        logger.info(`Waiting for messages in queue '${QUEUE_NAME}'...`);
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                logger.debug('Received message from queue', { metadata: { queue: QUEUE_NAME } });
                // Use the new generic handler
                const success = await handleNotificationEvent(msg);
                if (success) {
                    channel.ack(msg);
                    logger.debug('Message acknowledged.');
                } else {
                    channel.nack(msg, false, false); // requeue = false, send to DLQ
                    // Error logging is handled within handleNotificationEvent
                }
            }
        });

        logger.info('RabbitMQ Consumer started successfully and waiting for messages.');
        retryAttempts = 0;
        isConnecting = false;

    } catch (error) {
        logger.error('Failed to start RabbitMQ consumer:', { metadata: { error: error.message } });
        isConnecting = false;
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
        logger.error('Error closing RabbitMQ connection:', { metadata: { error: error.message } });
    }
    resetConnectionState();
}

module.exports = {
    startConsumer,
    closeConnection
}; 