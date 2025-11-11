import { logger } from '../utils/logger';
import { redisStore } from './redis-store';
import { poeNinjaClient } from './poe-ninja-client';
import { SENTIMENT_THRESHOLDS, VOLATILITY_THRESHOLDS } from '../config/constants';
import type {
  CurrencyData,
  MoverData,
  CurrencyAnalytics,
  MarketTrends
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
    limit: number = 10,
    tierFilter: string = 'all',
    exaltedPrice?: number
  ): Promise<{ gainers: MoverData[]; losers: MoverData[] }> {
    try {
      // Check cache first (include tier in cache key)
      const cacheKey = `movers:${league}:${limit}:${tierFilter}`;
      const cached = await redisStore.getDiscordCache(cacheKey);
      if (cached) {
        logger.debug('Cache hit for movers');
        return cached;
      }

      // Fetch all currencies
      const currencies = await poeNinjaClient.getAllCurrencies(league);

      // Calculate tier thresholds in chaos
      let minChaos = 0;
      if (tierFilter !== 'all' && exaltedPrice) {
        const tierThresholds: { [key: string]: number } = {
          'budget': 0.1,   // 0.1 exalt
          'mid': 1,        // 1 exalt
          'premium': 10,   // 10 exalt
          'elite': 100     // 100 exalt
        };
        const minExalt = tierThresholds[tierFilter] || 0;
        minChaos = minExalt * exaltedPrice;
        logger.debug(`[Movers] Tier filter: ${tierFilter}, minChaos: ${minChaos}`);
      }

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
        .filter(m => m.changePercent !== 0) // Filter out unchanged
        .filter(m => m.currentPrice >= minChaos); // Apply tier filter

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

      // Calculate average change
      const totalChange = currencies.reduce((sum, c) => sum + c.paySparkLine.totalChange, 0);
      const averageChange24h = totalChange / currencies.length;

      // Calculate market breadth
      const gainers = currencies.filter(c => c.paySparkLine.totalChange > 0).length;
      const losers = currencies.filter(c => c.paySparkLine.totalChange < 0).length;
      const unchanged = currencies.filter(c => c.paySparkLine.totalChange === 0).length;
      const total = currencies.length;

      const marketBreadth = {
        gainersPercent: (gainers / total) * 100,
        losersPercent: (losers / total) * 100,
        unchangedPercent: (unchanged / total) * 100
      };

      // Find top movers
      const sortedByChange = [...currencies].sort((a, b) =>
        b.paySparkLine.totalChange - a.paySparkLine.totalChange
      );
      const topGainer = sortedByChange[0];
      const topLoser = sortedByChange[sortedByChange.length - 1];

      const topMover = {
        gainer: {
          currency: topGainer.currencyTypeName,
          change: topGainer.paySparkLine.totalChange
        },
        loser: {
          currency: topLoser.currencyTypeName,
          change: topLoser.paySparkLine.totalChange
        }
      };

      // Get key currencies (Divine, Exalted, Chaos)
      const divine = currencies.find(c =>
        c.currencyTypeName.toLowerCase().includes('divine orb') &&
        !c.currencyTypeName.toLowerCase().includes('greater') &&
        !c.currencyTypeName.toLowerCase().includes('perfect')
      );
      const exalted = currencies.find(c =>
        c.currencyTypeName.toLowerCase().includes('exalted orb') &&
        !c.currencyTypeName.toLowerCase().includes('greater') &&
        !c.currencyTypeName.toLowerCase().includes('perfect')
      );
      const chaos = currencies.find(c =>
        c.currencyTypeName.toLowerCase() === 'chaos orb' ||
        c.currencyTypeName.toLowerCase().includes('chaos orb')
      );

      const divinePrice = divine?.chaosEquivalent || 0;
      const exaltedPrice = exalted?.chaosEquivalent || 0;
      const chaosPrice = chaos?.chaosEquivalent || 1;

      const keyCurrencies = {
        divine: divinePrice,
        exalted: exaltedPrice,
        chaos: chaosPrice,
        divineToExaltedRatio: exaltedPrice > 0 ? divinePrice / exaltedPrice : 0
      };

      // Calculate total liquidity
      const totalLiquidity = currencies.reduce((sum, c) => sum + c.pay.listing_count, 0);

      // Calculate volatilities for all currencies (or top 20 for performance)
      const currenciesForVolatility = currencies.slice(0, 20);
      const volatilityData = await Promise.all(
        currenciesForVolatility.map(async (c) => {
          const history = await redisStore.getPriceHistory(league, c.currencyTypeName, 288);
          const prices = history.map(h => parseFloat(h.price)).filter(p => !isNaN(p));
          const volatility = this.calculateVolatility(prices);
          return { currency: c.currencyTypeName, volatility };
        })
      );

      // Find most stable (lowest volatility)
      const mostStableCurrency = volatilityData.reduce((min, curr) =>
        curr.volatility < min.volatility ? curr : min
      );

      const mostStable = {
        currency: mostStableCurrency.currency,
        volatility: mostStableCurrency.volatility
      };

      // Calculate average volatility index
      const volatilityIndex = volatilityData.reduce((sum, v) => sum + v.volatility, 0) / volatilityData.length;

      // Determine market sentiment with more granularity
      const sentiment = this.determineSentiment(averageChange24h);

      const trends: MarketTrends = {
        league,
        mostActive: {
          currency: mostActive.currencyTypeName,
          volume: mostActive.pay.listing_count
        },
        sentiment,
        averageChange24h,
        volatilityIndex,
        marketBreadth,
        topMover,
        keyCurrencies,
        totalLiquidity,
        mostStable,
        currenciesTracked: currencies.length,
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
