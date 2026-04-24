/**
 * Simple structured logging utility
 * Provides console logging with timestamps and levels
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const getTimestamp = () => new Date().toISOString();

const log = (level, message, data = null) => {
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...(data && { data })
  };

  const logString = JSON.stringify(logEntry);
  
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(logString);
      break;
    case LOG_LEVELS.WARN:
      console.warn(logString);
      break;
    case LOG_LEVELS.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.log(logString);
      }
      break;
    case LOG_LEVELS.INFO:
    default:
      console.log(logString);
  }
};

export const logger = {
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data)
};

export default logger;
