/**
 * Retry helper utilities for resilient external API calls
 */

/**
 * Execute an async operation with configurable retry logic
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry configuration
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number[]} options.delays - Array of delays between attempts in ms (default: [1000, 2000, 4000])
 * @param {string} options.operationName - Name for logging (default: 'operation')
 * @param {Function} options.shouldRetry - Function to determine if error is retryable (default: true)
 * @returns {Promise<any>} Result of successful operation
 */
async function executeWithRetry(operation, options = {}) {
  const {
    maxAttempts = 3,
    delays = [1000, 2000, 4000],
    operationName = 'operation',
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await operation();

      if (attempt > 0) {
        console.log(`[Retry] ${operationName} succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error)) {
        console.error(`[Retry] ${operationName} failed with non-retryable error:`, error.message);
        throw error;
      }

      // Check if we have more attempts
      if (attempt < maxAttempts - 1) {
        const delay = delays[attempt] || delays[delays.length - 1];
        console.log(`[Retry] ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[Retry] ${operationName} failed after ${maxAttempts} attempts`);
      }
    }
  }

  throw lastError;
}

/**
 * Determine if an error is retryable based on common patterns
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  const message = error.message?.toLowerCase() || '';

  // Network and timeout errors
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network')
  ) {
    return true;
  }

  // HTTP status codes that are retryable
  const status = error.status || error.statusCode;
  if (status && (status === 408 || status === 429 || status === 502 || status === 503 || status === 504)) {
    return true;
  }

  // Database connection errors
  if (
    message.includes('connection') ||
    message.includes('econnection') ||
    message.includes('pool')
  ) {
    return true;
  }

  return false;
}

/**
 * Execute with exponential backoff
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Backoff configuration
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 5)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.factor - Backoff factor (default: 2)
 * @returns {Promise<any>} Result of successful operation
 */
async function executeWithBackoff(operation, options = {}) {
  const {
    maxAttempts = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    operationName = 'operation'
  } = options;

  let delay = baseDelay;
  const delays = [];

  for (let i = 0; i < maxAttempts - 1; i++) {
    delays.push(Math.min(delay, maxDelay));
    delay *= factor;
  }

  return executeWithRetry(operation, {
    maxAttempts,
    delays,
    operationName,
    shouldRetry: isRetryableError
  });
}

module.exports = {
  executeWithRetry,
  isRetryableError,
  executeWithBackoff
};