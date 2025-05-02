const winston = require('winston');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define logging level based on environment (default to debug for dev)
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn'; // Log more in dev, less in prod
};

// Define colors for levels (optional, mainly for console readability)
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Use JSON format for structured logging
  winston.format.json()
);

// Define transports (where logs go)
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize({ all: true }), // Add colors to console output
        winston.format.printf(
            (info) => `[${info.timestamp}] ${info.level}: ${info.message}` + (info.metadata && Object.keys(info.metadata).length ? ` \nMetadata: ${JSON.stringify(info.metadata, null, 2)}` : '')
        )
    )
  }),
  // Future: Add File transport or integration with log management systems
  // new winston.transports.File({
  //   filename: 'logs/error.log',
  //   level: 'error',
  // }),
  // new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Do not exit on handled exceptions
  // exitOnError: false, 
});

// Add helper for morgan integration
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

module.exports = logger; 