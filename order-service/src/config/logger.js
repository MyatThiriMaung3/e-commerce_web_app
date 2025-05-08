const winston = require('winston');
require('dotenv').config(); // Keep dotenv for LOG_LEVEL

// Basic format for console
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (stack) {
            log += '\n' + stack;
        }
        return log;
    })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: consoleFormat, // Use the simplified console format
  transports: [
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    // For now, keep a console exception handler, as it seemed to help previously
    new winston.transports.Console({
        format: consoleFormat // Use the same simple format
    })
  ],
  exitOnError: false, // Crucial: prevent Winston from exiting on handled/unhandled exceptions by its handlers
});

// Remove stream for morgan for now, as morgan itself is commented out in server.js or uses 'dev'

module.exports = logger; 