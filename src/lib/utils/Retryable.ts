import logger from './logger';

export class Retryable {
  /**
   * Generic retry function with exponential backoff.
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    beforeExecution = async (attempt: number) => {},
    maxRetries: number = 5,
    initialDelay: number = 1000,
    factor: number = 2,
    shouldRetry?: (error: any) => boolean,
  ): Promise<T> {
    let retries = 0;
    let delay = initialDelay;
    let lastError: any;

    while (retries < maxRetries) {
      try {
        await beforeExecution(retries);

        return await fn();
      } catch (error: any) {
        if (shouldRetry && !shouldRetry(error)) {
          throw error;
        }

        lastError = error;
        retries++;

        logger.warn({
          message: `Retrying after error: ${error.message}. Attempt ${retries} of ${maxRetries}`,
          service: 'RetryService',
          properties: {
            delay,
            error: error.stack || error,
          },
        });

        // Wait for the delay period before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Increase the delay for the next attempt
        delay *= factor;
      }
    }

    throw lastError;
  }
}
