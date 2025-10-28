import { logger } from '../utils/logger';
import { redisStore } from './redis-store';
import { poeNinjaClient } from './poe-ninja-client';
import { SENTIMENT_THRESHOLDS, VOLATILITY_THRESHOLDS } from '../config/constants';
import type {
  CurrencyData,
  MoverData,
  CurrencyAnalytics,
  MarketTrends,
  PriceHistoryEntry
} from '../models/types';

/**
 * Service for analyzing currency data and market trends
 */
export class CurrencyAnalyzer {
  /**
   * Calculate market movers (gainers and losers)
   */
  async calculateMovers(
    league: string,
    limit: number = 10
  ): Promise<{ gainers: MoverData[]; losers: MoverData[] }> {
    try {
      // Check cache first
      const cacheKey = `movers:${league}:${limit}`;
      const cached = await redisStore.getDiscordCache(cacheKey);
      if (cached) {
        logger.debug('Cache hit for movers');
        return cached;
      }

      // Fetch all currencies
      const currencies = await poeNinjaClient.getAllCurrencies(league);

      // Calculate movers
      const movers: MoverData[] = currencies
        .map(c => {
          const changePercent = c.paySparkLine.totalChange;
          const currentPrice = c.chaosEquivalent;
          const previousPrice = currentPrice / (1 + changePercent / 100);

          return {
            currencyTypeName: c.currencyTypeName,
            currentPrice,
            previousPrice,
            changePercent,
            changeAbsolute: currentPrice - previousPrice,
            volume: c.pay.listing_count
          };
        })
        .filter(m => m.changePercent !== 0); // Filter out unchanged

      // Sort and get top gainers
      const gainers = movers
        .filter(m => m.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, limit);

      // Sort and get top losers
      const losers = movers
        .filter(m => m.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit);

      const result = { gainers, losers };

      // Cache result
      await redisStore.storeDiscordCache(cacheKey, result, 180);

      return result;
    } catch (error) {
      logger.error('Error calculating movers:', error);
      throw error;
    }
  }

  /**
   * Analyze currency and generate analytics
   */
  async analyzeCurrency(
    league: string,
    currencyName: string
  ): Promise<CurrencyAnalytics | null> {
    try {
      const currency = await poeNinjaClient.getCurrency(league, currencyName);
      if (!currency) return null;

      // Get price history
      const history = await redisStore.getPriceHistory(league, currencyName, 288); // 24h at 5min intervals

      const prices = history.map(h => parseFloat(h.price)).filter(p => !isNaN(p));

      // Calculate statistics
      const currentPrice = currency.chaosEquivalent;
      const priceChange24h = currency.paySparkLine.totalChange;
      const high24h = prices.length > 0 ? Math.max(...prices) : currentPrice;
      const low24h = prices.length > 0 ? Math.min(...prices) : currentPrice;
      const averagePrice24h = prices.length > 0
        ? prices.reduce((sum, p) => sum + p, 0) / prices.length
        : currentPrice;

      // Calculate volatility (standard deviation / mean * 100)
      const volatilityValue = this.calculateVolatility(prices);

      // Determine sentiment
      const sentiment = this.determineSentiment(priceChange24h);

      // Determine volatility category
      const volatility = this.categorizeVolatility(volatilityValue);

      return {
        currencyName: currency.currencyTypeName,
        league,
        sentiment,
        volatility,
        priceChange24h,
        averagePrice24h,
        high24h,
        low24h,
        lastUpdated: currency.pay.sample_time_utc
      };
    } catch (error) {
      logger.error('Error analyzing currency:', error);
      return null;
    }
  }

  /**
   * Generate market trends summary
   */
  async generateMarketTrends(league: string): Promise<MarketTrends> {
    try {
      // Check cache
      const cacheKey = `trends:${league}`;
      const cached = await redisStore.getDiscordCache(cacheKey);
      if (cached) {
        logger.debug('Cache hit for market trends');
        return cached;
      }

      const currencies = await poeNinjaClient.getAllCurrencies(league);

      // Find most active (highest listing count)
      const mostActive = currencies.reduce((max, c) =>
        c.pay.listing_count > max.pay.listing_count ? c : max
      );

      // Find most valuable
      const mostValuable = currencies.reduce((max, c) =>
        c.chaosEquivalent > max.chaosEquivalent ? c : max
      );

      // Calculate average change
      const totalChange = currencies.reduce((sum, c) => sum + c.paySparkLine.totalChange, 0);
      const averageChange24h = totalChange / currencies.length;

      // Calculate average volatility
      const volatilities = await Promise.all(
        currencies.slice(0, 10).map(c =>
          redisStore.getPriceHistory(league, c.currencyTypeName, 288)
            .then(history => {
              const prices = history.map(h => parseFloat(h.price)).filter(p => !isNaN(p));
              return this.calculateVolatility(prices);
            })
        )
      );

      const volatilityIndex = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;

      // Determine market sentiment
      const sentiment = averageChange24h > 5 ? 'bullish' :
                       averageChange24h < -5 ? 'bearish' : 'neutral';

      const trends: MarketTrends = {
        league,
        mostActive: {
          currency: mostActive.currencyTypeName,
          volume: mostActive.pay.listing_count
        },
        mostValuable: {
          currency: mostValuable.currencyTypeName,
          price: mostValuable.chaosEquivalent
        },
        sentiment,
        averageChange24h,
        volatilityIndex,
        lastUpdated: new Date().toISOString()
      };

      // Cache trends
      await redisStore.storeDiscordCache(cacheKey, trends, 300);

      return trends;
    } catch (error) {
      logger.error('Error generating market trends:', error);
      throw error;
    }
  }

  /**
   * Calculate volatility (standard deviation percentage)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 100;
  }

  /**
   * Determine sentiment based on price change
   */
  private determineSentiment(
    change: number
  ): 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish' {
    if (change >= SENTIMENT_THRESHOLDS.VERY_BULLISH) return 'very_bullish';
    if (change >= SENTIMENT_THRESHOLDS.BULLISH) return 'bullish';
    if (change >= SENTIMENT_THRESHOLDS.NEUTRAL) return 'neutral';
    if (change >= SENTIMENT_THRESHOLDS.BEARISH) return 'bearish';
    return 'very_bearish';
  }

  /**
   * Categorize volatility
   */
  private categorizeVolatility(volatility: number): 'high' | 'medium' | 'low' {
    if (volatility >= VOLATILITY_THRESHOLDS.HIGH) return 'high';
    if (volatility >= VOLATILITY_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  /**
   * Search currencies by name
   */
  async searchCurrencies(league: string, query: string): Promise<CurrencyData[]> {
    try {
      const currencies = await poeNinjaClient.getAllCurrencies(league);
      const lowerQuery = query.toLowerCase();

      return currencies
        .filter(c => c.currencyTypeName.toLowerCase().includes(lowerQuery))
        .sort((a, b) => {
          // Sort by relevance (exact match first, then starts with, then contains)
          const aName = a.currencyTypeName.toLowerCase();
          const bName = b.currencyTypeName.toLowerCase();

          if (aName === lowerQuery) return -1;
          if (bName === lowerQuery) return 1;
          if (aName.startsWith(lowerQuery)) return -1;
          if (bName.startsWith(lowerQuery)) return 1;

          return aName.localeCompare(bName);
        });
    } catch (error) {
      logger.error('Error searching currencies:', error);
      return [];
    }
  }
}

export const currencyAnalyzer = new CurrencyAnalyzer();
