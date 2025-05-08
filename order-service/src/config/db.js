const mongoose = require('mongoose');
const logger = require('./logger'); // RESTORED
require('dotenv').config();

// const DATABASE_URL = process.env.DATABASE_URL; // Old
const MONGO_URI = process.env.ORDER_MONGO_URI; // New - matches docker-compose

const connectDB = async () => {
    // if (!DATABASE_URL) { // Old
    if (!MONGO_URI) { // New
        logger.error('ORDER_MONGO_URI is not defined in environment variables.'); // RESTORED
        process.exit(1); // Exit process with failure
    }

    try {
        // Mongoose connection options (adjust as needed)
        const connOptions = {
            // useNewUrlParser: true, // No longer needed since Mongoose 6
            // useUnifiedTopology: true, // No longer needed since Mongoose 6
            // useCreateIndex: true, // No longer supported
            // useFindAndModify: false, // No longer supported
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        };

        // const conn = await mongoose.connect(DATABASE_URL, connOptions); // Old
        const conn = await mongoose.connect(MONGO_URI, connOptions); // New

        logger.info(`MongoDB Connected: ${conn.connection.host}`); // RESTORED

        // Optional: Listen for connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err); // RESTORED
        });
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected.'); // RESTORED
        });
        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected.'); // RESTORED
        });

    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`); // RESTORED
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB; 