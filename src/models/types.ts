/**
 * Core data types for PoE2 economy data
 */

// Currency data structure from poe.ninja
export interface CurrencyData {
  currencyTypeName: string;
  chaosEquivalent: number;
  paySparkLine: SparkLine;
  receiveSparkLine: SparkLine;
  pay: CurrencyDetail;
  receive?: CurrencyDetail;
}

export interface SparkLine {
  data: number[];
  totalChange: number;
}

export interface CurrencyDetail {
  count: number;
  value: number;
  listing_count: number;
  sample_time_utc: string;
}

// API response structure
export interface CurrencyOverviewResponse {
  lines: CurrencyData[];
  currencyDetails: CurrencyMetadata[];
}

export interface CurrencyMetadata {
  id: number;
  icon: string;
  name: string;
  tradeId?: string;
}

// Scraped data structure from browser
export interface ScrapedCurrencyData {
  currencyTypeName: string;
  chaosEquivalent: number;
  volumePerHour?: number;
  changePercent?: number;
}

// Price history entry
export interface PriceHistoryEntry {
  timestamp: number;
  price: number;
  volume?: number;
}

// Market movers
export interface MoverData {
  currencyTypeName: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  changeAbsolute: number;
  volume?: number;
}

// Analytics/indicators
export interface CurrencyAnalytics {
  currencyName: string;
  league: string;
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  volatility: 'high' | 'medium' | 'low';
  priceChange24h: number;
  priceChange7d?: number;
  averagePrice24h: number;
  high24h: number;
  low24h: number;
  volumeChange24h?: number;
  marketCap?: number;
  lastUpdated: string;
}

// Chart data
export interface ChartData {
  labels: string[];
  prices: number[];
  volumes?: number[];
}

// League information
export interface LeagueInfo {
  name: string;
  displayName: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  currencyCount: number;
}

// Market trends summary
export interface MarketTrends {
  league: string;
  mostActive: {
    currency: string;
    volume: number;
  };
  mostValuable: {
    currency: string;
    price: number;
  };
  sentiment: 'bullish' | 'bearish' | 'neutral';
  averageChange24h: number;
  volatilityIndex: number;
  lastUpdated: string;
}

// Rate limit tracking
export interface RateLimitInfo {
  endpoint: string;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
}

// Cache entry wrapper
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Discord embed field data
export interface EmbedFieldData {
  name: string;
  value: string;
  inline?: boolean;
}

// Server preferences
export interface ServerPreferences {
  guildId: string;
  defaultLeague: string;
  alertChannelId?: string;
  prefix?: string;
}

// User alert configuration (future feature)
export interface UserAlert {
  userId: string;
  guildId: string;
  currency: string;
  league: string;
  condition: 'above' | 'below' | 'change_above' | 'change_below';
  threshold: number;
  createdAt: string;
  triggeredAt?: string;
}

// Command cooldown tracking
export interface CooldownData {
  userId: string;
  commandName: string;
  expiresAt: number;
}

// Error types
export class CurrencyNotFoundError extends Error {
  constructor(currency: string, league: string) {
    super(`Currency "${currency}" not found in league "${league}"`);
    this.name = 'CurrencyNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(endpoint: string, retryAfter: number) {
    super(`Rate limit exceeded for ${endpoint}. Retry after ${retryAfter}s`);
    this.name = 'RateLimitError';
  }
}

export class DataFetchError extends Error {
  constructor(source: string, originalError?: Error) {
    super(`Failed to fetch data from ${source}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'DataFetchError';
    this.cause = originalError;
  }
}

// Type guards
export function isCurrencyData(obj: any): obj is CurrencyData {
  return (
    typeof obj === 'object' &&
    typeof obj.currencyTypeName === 'string' &&
    typeof obj.chaosEquivalent === 'number' &&
    obj.paySparkLine !== undefined
  );
}

export function isScrapedCurrencyData(obj: any): obj is ScrapedCurrencyData {
  return (
    typeof obj === 'object' &&
    typeof obj.currencyTypeName === 'string' &&
    typeof obj.chaosEquivalent === 'number'
  );
}
