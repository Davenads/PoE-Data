import Redis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { CACHE_TTL } from '../config/constants';

/**
 * Redis data store for caching and persistence
 */
export class RedisDataStore {
  public client: Redis;
  private connected: boolean = false;
  private keyPrefix: string;

  constructor() {
    this.keyPrefix = config.redis.keyPrefix;

    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.setupEventHandlers();
  }

  /**
   * Add prefix to key
   */
  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.connected = true;
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.connected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
      this.connected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.client.ping();
      this.connected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(this.prefixKey(key));
      if (!data) return null;

      const parsed = JSON.parse(data);
      return parsed as T;
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setex(this.prefixKey(key), ttlSeconds, serialized);
      } else {
        await this.client.set(this.prefixKey(key), serialized);
      }
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.prefixKey(key));
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.prefixKey(key));
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(this.prefixKey(pattern));
      // Strip prefix from returned keys for consistency
      return keys.map(key => key.substring(this.keyPrefix.length));
    } catch (error) {
      logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Add entry to Redis stream
   */
  async addToStream(streamKey: string, fields: Record<string, string>): Promise<void> {
    try {
      await this.client.xadd(this.prefixKey(streamKey), '*', ...Object.entries(fields).flat());
    } catch (error) {
      logger.error(`Error adding to stream ${streamKey}:`, error);
    }
  }

  /**
   * Get stream entries
   */
  async getStreamEntries(streamKey: string, count: number = 100): Promise<any[]> {
    try {
      const results = await this.client.xrevrange(this.prefixKey(streamKey), '+', '-', 'COUNT', count);
      return results.map(([id, fields]) => {
        const obj: any = { id };
        for (let i = 0; i < fields.length; i += 2) {
          obj[fields[i]] = fields[i + 1];
        }
        return obj;
      });
    } catch (error) {
      logger.error(`Error reading stream ${streamKey}:`, error);
      return [];
    }
  }

  /**
   * Trim stream to max length
   */
  async trimStream(streamKey: string, maxLength: number): Promise<void> {
    try {
      await this.client.xtrim(this.prefixKey(streamKey), 'MAXLEN', '~', maxLength);
    } catch (error) {
      logger.error(`Error trimming stream ${streamKey}:`, error);
    }
  }

  /**
   * Store currency data
   */
  async storeCurrencyData(league: string, currency: string, data: any): Promise<void> {
    const key = `currency:${league}:${currency}:current`;
    await this.set(key, data, CACHE_TTL.CURRENCY_DATA);
  }

  /**
   * Get currency data
   */
  async getCurrencyData(league: string, currency: string): Promise<any> {
    const key = `currency:${league}:${currency}:current`;
    return await this.get(key);
  }

  /**
   * Store price history entry
   */
  async storePriceHistory(league: string, currency: string, price: number, volume?: number): Promise<void> {
    const streamKey = `prices:stream:${league}:${currency}`;
    const timestamp = Date.now().toString();

    const fields: Record<string, string> = {
      timestamp,
      price: price.toString()
    };

    if (volume !== undefined) {
      fields.volume = volume.toString();
    }

    await this.addToStream(streamKey, fields);

    // Trim to keep only last ~3.5 days (1000 entries at 5-minute intervals)
    // Optimized for free-tier Redis (25-30MB limit)
    await this.trimStream(streamKey, 1000);
  }

  /**
   * Get price history
   */
  async getPriceHistory(league: string, currency: string, count: number = 100): Promise<any[]> {
    const streamKey = `prices:stream:${league}:${currency}`;
    return await this.getStreamEntries(streamKey, count);
  }

  /**
   * Store Discord-specific cached data
   */
  async storeDiscordCache(key: string, data: any, ttl: number): Promise<void> {
    const fullKey = `discord:${key}`;
    await this.set(fullKey, data, ttl);
  }

  /**
   * Get Discord-specific cached data
   */
  async getDiscordCache(key: string): Promise<any> {
    const fullKey = `discord:${key}`;
    return await this.get(fullKey);
  }

  /**
   * Store server preferences
   */
  async storeServerPreferences(guildId: string, preferences: any): Promise<void> {
    const key = `discord:server:${guildId}:preferences`;
    await this.set(key, preferences); // No TTL - persistent
  }

  /**
   * Get server preferences
   */
  async getServerPreferences(guildId: string): Promise<any> {
    const key = `discord:server:${guildId}:preferences`;
    return await this.get(key);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
    logger.info('Redis connection closed');
  }
}

// Export singleton instance
export const redisStore = new RedisDataStore();
