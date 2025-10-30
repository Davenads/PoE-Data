import { redisStore } from '../services/redis-store';
import { logger } from './logger';

/**
 * Calculate price change over a specific time period using Redis price history
 *
 * @param league - League name
 * @param currency - Currency name
 * @param currentPrice - Current price in chaos
 * @param hoursAgo - Number of hours to look back (e.g., 12, 24)
 * @param toleranceHours - Maximum hours difference to accept (default: 3)
 * @returns Percentage change or null if insufficient data
 */
export async function calculatePriceChange(
  league: string,
  currency: string,
  currentPrice: number,
  hoursAgo: number,
  toleranceHours: number = 3
): Promise<number | null> {
  try {
    const now = Date.now();
    const targetTime = now - (hoursAgo * 60 * 60 * 1000);

    // Fetch enough history to cover the timeframe with some buffer
    // Assuming hourly data points, fetch 2x the target hours to handle gaps
    const historyCount = Math.max(hoursAgo * 2, 100);
    const history = await redisStore.getPriceHistory(league, currency, historyCount);

    if (history.length === 0) {
      logger.debug(`No price history available for ${currency} in ${league}`);
      return null;
    }

    // Find entry closest to target time
    let closestEntry = null;
    let minTimeDiff = Infinity;

    for (const entry of history) {
      const timestamp = parseInt(entry.timestamp);
      const timeDiff = Math.abs(timestamp - targetTime);

      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestEntry = entry;
      }
    }

    if (!closestEntry) {
      logger.debug(`No suitable entry found for ${currency} ${hoursAgo}h ago`);
      return null;
    }

    // Check if closest entry is within tolerance
    const hoursDiff = minTimeDiff / (60 * 60 * 1000);
    if (hoursDiff > toleranceHours) {
      logger.debug(
        `Closest entry for ${currency} is ${hoursDiff.toFixed(1)}h away from target ${hoursAgo}h (tolerance: ${toleranceHours}h)`
      );
      return null;
    }

    // Calculate percentage change
    const oldPrice = parseFloat(closestEntry.price);
    if (oldPrice === 0 || isNaN(oldPrice)) {
      logger.warn(`Invalid old price for ${currency}: ${closestEntry.price}`);
      return null;
    }

    const change = ((currentPrice - oldPrice) / oldPrice) * 100;

    logger.debug(
      `${currency}: ${hoursAgo}h change = ${change.toFixed(2)}% (${oldPrice} -> ${currentPrice}, ${hoursDiff.toFixed(1)}h ago)`
    );

    return change;

  } catch (error) {
    logger.error(`Error calculating ${hoursAgo}h price change for ${currency}:`, error);
    return null;
  }
}

/**
 * Calculate 12-hour price change
 */
export async function calculate12hChange(
  league: string,
  currency: string,
  currentPrice: number
): Promise<number | null> {
  return calculatePriceChange(league, currency, currentPrice, 12);
}

/**
 * Calculate 24-hour price change
 */
export async function calculate24hChange(
  league: string,
  currency: string,
  currentPrice: number
): Promise<number | null> {
  return calculatePriceChange(league, currency, currentPrice, 24);
}

/**
 * Get multiple timeframe changes at once (efficient batch operation)
 */
export async function getMultiTimeframeChanges(
  league: string,
  currency: string,
  currentPrice: number
): Promise<{
  change12h: number | null;
  change24h: number | null;
}> {
  // Fetch history once and reuse for both calculations
  const now = Date.now();
  const target12h = now - (12 * 60 * 60 * 1000);
  const target24h = now - (24 * 60 * 60 * 1000);

  try {
    // Fetch enough history for 24h (covers 12h as well)
    const history = await redisStore.getPriceHistory(league, currency, 100);

    if (history.length === 0) {
      return { change12h: null, change24h: null };
    }

    // Find closest entries for both timeframes
    let closest12h = null;
    let minDiff12h = Infinity;
    let closest24h = null;
    let minDiff24h = Infinity;

    for (const entry of history) {
      const timestamp = parseInt(entry.timestamp);

      // Check for 12h
      const diff12h = Math.abs(timestamp - target12h);
      if (diff12h < minDiff12h) {
        minDiff12h = diff12h;
        closest12h = entry;
      }

      // Check for 24h
      const diff24h = Math.abs(timestamp - target24h);
      if (diff24h < minDiff24h) {
        minDiff24h = diff24h;
        closest24h = entry;
      }
    }

    // Calculate changes with tolerance check (3 hours)
    const toleranceMs = 3 * 60 * 60 * 1000;

    const change12h = (closest12h && minDiff12h < toleranceMs)
      ? ((currentPrice - parseFloat(closest12h.price)) / parseFloat(closest12h.price)) * 100
      : null;

    const change24h = (closest24h && minDiff24h < toleranceMs)
      ? ((currentPrice - parseFloat(closest24h.price)) / parseFloat(closest24h.price)) * 100
      : null;

    return { change12h, change24h };

  } catch (error) {
    logger.error(`Error calculating multi-timeframe changes for ${currency}:`, error);
    return { change12h: null, change24h: null };
  }
}
