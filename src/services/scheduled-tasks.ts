import * as cron from 'node-cron';
import { poeNinjaClient } from './poe-ninja-client';
import { redisStore } from './redis-store';
import { logger } from '../utils/logger';
import { SCHEDULED_TASKS, SCHEDULED_FETCH_CURRENCIES } from '../config/constants';
import type { CurrencyData } from '../models/types';

/**
 * Scheduled task manager for periodic data fetching
 */
export class ScheduledTaskService {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private lastRunStatus: 'success' | 'failure' | null = null;
  private lastRunStats: { currencies: number; duration: number } | null = null;

  /**
   * Initialize and start all scheduled tasks
   */
  start(): void {
    if (!SCHEDULED_TASKS.PRICE_FETCH_ENABLED) {
      logger.info('[Scheduled Tasks] Price fetching is disabled in configuration');
      return;
    }

    logger.info('[Scheduled Tasks] Initializing scheduled tasks...');

    // Schedule hourly price fetch
    const priceFetchTask = cron.schedule(
      SCHEDULED_TASKS.PRICE_FETCH_CRON,
      () => this.fetchPrices(),
      {
        timezone: 'UTC'
      }
    );

    this.tasks.push(priceFetchTask);
    this.isRunning = true;

    logger.info(`[Scheduled Tasks] ✓ Price fetch scheduled: ${SCHEDULED_TASKS.PRICE_FETCH_CRON} UTC`);
    logger.info(`[Scheduled Tasks] Fetch mode: ${SCHEDULED_TASKS.FETCH_ALL_CURRENCIES ? 'ALL currencies' : `${SCHEDULED_FETCH_CURRENCIES.length} popular currencies`}`);

    // Run initial fetch immediately (don't wait for first cron cycle)
    logger.info('[Scheduled Tasks] Running initial price fetch...');
    this.fetchPrices().catch(error => {
      logger.error('[Scheduled Tasks] Initial fetch failed:', error);
    });
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info('[Scheduled Tasks] Stopping all scheduled tasks...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    this.isRunning = false;

    logger.info('[Scheduled Tasks] ✓ All tasks stopped');
  }

  /**
   * Get task status for monitoring
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    lastRunStatus: 'success' | 'failure' | null;
    lastRunStats: { currencies: number; duration: number } | null;
  } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      lastRunStatus: this.lastRunStatus,
      lastRunStats: this.lastRunStats
    };
  }

  /**
   * Main scheduled task: Fetch currency prices for all leagues
   */
  private async fetchPrices(): Promise<void> {
    const startTime = Date.now();
    this.lastRunTime = new Date();

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('[Scheduled Fetch] Starting hourly price fetch...');
    logger.info(`[Scheduled Fetch] Time: ${this.lastRunTime.toISOString()}`);

    try {
      const leagues = ['Dawn', 'Standard']; // Active PoE2 leagues
      let totalCurrenciesFetched = 0;

      for (const league of leagues) {
        logger.info(`[Scheduled Fetch] Fetching ${league} league...`);

        try {
          if (SCHEDULED_TASKS.FETCH_ALL_CURRENCIES) {
            // Fetch ALL currencies for this league
            const currencies = await poeNinjaClient.getAllCurrencies(league);
            totalCurrenciesFetched += currencies.length;

            // Store price history for all currencies
            for (const currency of currencies) {
              await this.storeCurrencyData(league, currency);
            }

            logger.info(`[Scheduled Fetch] ✓ ${league}: ${currencies.length} currencies fetched`);

          } else {
            // Fetch only popular currencies
            let fetchedCount = 0;
            let failedCount = 0;

            for (const currencyName of SCHEDULED_FETCH_CURRENCIES) {
              try {
                const currency = await poeNinjaClient.getCurrency(league, currencyName);

                if (currency) {
                  await this.storeCurrencyData(league, currency);
                  fetchedCount++;
                } else {
                  logger.debug(`[Scheduled Fetch] ${currencyName} not found in ${league}`);
                  failedCount++;
                }
              } catch (error) {
                logger.error(`[Scheduled Fetch] Failed to fetch ${currencyName} in ${league}:`, error);
                failedCount++;
              }
            }

            totalCurrenciesFetched += fetchedCount;
            logger.info(`[Scheduled Fetch] ✓ ${league}: ${fetchedCount}/${SCHEDULED_FETCH_CURRENCIES.length} currencies fetched (${failedCount} failed)`);
          }

        } catch (error) {
          logger.error(`[Scheduled Fetch] Failed to fetch ${league} league:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.lastRunStatus = 'success';
      this.lastRunStats = { currencies: totalCurrenciesFetched, duration };

      logger.info(`[Scheduled Fetch] ✓ Fetch completed successfully`);
      logger.info(`[Scheduled Fetch] Total currencies: ${totalCurrenciesFetched}`);
      logger.info(`[Scheduled Fetch] Duration: ${(duration / 1000).toFixed(2)}s`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastRunStatus = 'failure';
      this.lastRunStats = { currencies: 0, duration };

      logger.error('[Scheduled Fetch] ❌ Fetch failed:', error);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * Store currency data and price history
   */
  private async storeCurrencyData(league: string, currency: CurrencyData): Promise<void> {
    try {
      // Store current data in cache
      await redisStore.storeCurrencyData(league, currency.currencyTypeName, currency);

      // Store price history entry
      await redisStore.storePriceHistory(
        league,
        currency.currencyTypeName,
        currency.chaosEquivalent,
        currency.pay?.listing_count || 0
      );

      logger.debug(
        `[Scheduled Fetch] Stored ${currency.currencyTypeName} (${league}): ${currency.chaosEquivalent}c`
      );

    } catch (error) {
      logger.error(`[Scheduled Fetch] Failed to store ${currency.currencyTypeName}:`, error);
    }
  }
}

// Export singleton instance
export const scheduledTasks = new ScheduledTaskService();

// Cleanup on process exit
process.on('SIGTERM', () => scheduledTasks.stop());
process.on('SIGINT', () => scheduledTasks.stop());
