import { redisStore } from './redis-store';
import { logger } from '../utils/logger';
import { RATE_LIMITS } from '../config/constants';
import { RateLimitError } from '../models/types';

/**
 * Rate limiter for API requests using Redis
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = RATE_LIMITS.POE_NINJA_REQUESTS, windowMs: number = RATE_LIMITS.POE_NINJA_WINDOW) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed for the given endpoint
   */
  async checkLimit(endpoint: string): Promise<boolean> {
    const key = `ratelimit:${endpoint}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Remove old entries
      await redisStore.client.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await redisStore.client.zcard(key);

      if (requestCount >= this.maxRequests) {
        logger.warn(`Rate limit exceeded for ${endpoint}`);
        return false;
      }

      // Add current request
      await redisStore.client.zadd(key, now, `${now}`);

      // Set expiry on key
      await redisStore.client.expire(key, Math.ceil(this.windowMs / 1000));

      return true;
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request (fail open)
      return true;
    }
  }

  /**
   * Wait for rate limit and then execute
   */
  async waitAndExecute<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
    const canProceed = await this.checkLimit(endpoint);

    if (!canProceed) {
      const retryAfter = await this.getRetryAfter(endpoint);
      throw new RateLimitError(endpoint, retryAfter);
    }

    return fn();
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  async getRetryAfter(endpoint: string): Promise<number> {
    const key = `ratelimit:${endpoint}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Get oldest request in current window
      const oldestRequests = await redisStore.client.zrangebyscore(key, windowStart, now, 'LIMIT', 0, 1);

      if (oldestRequests.length === 0) {
        return 0;
      }

      const oldestTimestamp = parseInt(oldestRequests[0], 10);
      const resetTime = oldestTimestamp + this.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return Math.max(retryAfter, 0);
    } catch (error) {
      logger.error('Error calculating retry-after:', error);
      return Math.ceil(this.windowMs / 1000);
    }
  }

  /**
   * Get current request count for endpoint
   */
  async getRequestCount(endpoint: string): Promise<number> {
    const key = `ratelimit:${endpoint}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      await redisStore.client.zremrangebyscore(key, 0, windowStart);
      return await redisStore.client.zcard(key);
    } catch (error) {
      logger.error('Error getting request count:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for endpoint
   */
  async reset(endpoint: string): Promise<void> {
    const key = `ratelimit:${endpoint}`;
    try {
      await redisStore.client.del(key);
      logger.info(`Rate limit reset for ${endpoint}`);
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
