import { PRICE_MULTIPLIERS } from '../config/constants';
import { getCurrencyEmoji } from './emoji-helper';
import { EMOJIS } from '../config/emojis';

/**
 * Format a price value with appropriate suffix (k, m, b)
 */
export function formatPrice(price: number, decimals: number = 2): string {
  if (price >= PRICE_MULTIPLIERS.b) {
    return `${(price / PRICE_MULTIPLIERS.b).toFixed(decimals)}b`;
  }
  if (price >= PRICE_MULTIPLIERS.m) {
    return `${(price / PRICE_MULTIPLIERS.m).toFixed(decimals)}m`;
  }
  if (price >= PRICE_MULTIPLIERS.k) {
    return `${(price / PRICE_MULTIPLIERS.k).toFixed(decimals)}k`;
  }
  return price.toFixed(decimals);
}

/**
 * Format a chaos price with chaos emoji
 */
export function formatChaosPrice(price: number, decimals: number = 2): string {
  const chaosEmoji = getCurrencyEmoji('Chaos Orb');
  return `${formatPrice(price, decimals)}${chaosEmoji}`;
}

/**
 * Smart price formatter that switches to Exalted Orbs for very cheap items
 * For items < 0.01 chaos, displays as "X per Ex" instead
 */
export function formatSmartPrice(chaosPrice: number, exaltedPrice?: number): string {
  const chaosEmoji = getCurrencyEmoji('Chaos Orb');
  const exaltedEmoji = getCurrencyEmoji('Exalted Orb');

  // If price is >= 0.01 chaos or we don't have exalted price, use normal chaos formatting
  if (chaosPrice >= 0.01 || !exaltedPrice || exaltedPrice === 0) {
    return `${formatPrice(chaosPrice, 2)}${chaosEmoji}`;
  }

  // For very cheap items, show how many you get per Exalted
  // Formula: (exaltedPrice in chaos) / (item price in chaos) = items per exalted
  const itemsPerExalted = exaltedPrice / chaosPrice;

  // Format with appropriate precision
  let formattedAmount: string;
  if (itemsPerExalted >= 1000) {
    formattedAmount = formatPrice(itemsPerExalted, 1);
  } else if (itemsPerExalted >= 100) {
    formattedAmount = itemsPerExalted.toFixed(0);
  } else if (itemsPerExalted >= 10) {
    formattedAmount = itemsPerExalted.toFixed(1);
  } else {
    formattedAmount = itemsPerExalted.toFixed(2);
  }

  return `${formattedAmount} per ${exaltedEmoji}`;
}

/**
 * Format price for movers display - always shows chaos with extended decimals for cheap items
 * This avoids the counterintuitive "per exalt" arrow direction issue
 */
export function formatMoversPrice(chaosPrice: number): string {
  const chaosEmoji = getCurrencyEmoji('Chaos Orb');

  // For items >= 0.01 chaos, use 2 decimals
  if (chaosPrice >= 0.01) {
    return `${formatPrice(chaosPrice, 2)}${chaosEmoji}`;
  }

  // For items < 0.01 chaos, use extended decimals
  if (chaosPrice >= 0.0001) {
    // Show 4 decimals (e.g., 0.0045c)
    return `${chaosPrice.toFixed(4)}${chaosEmoji}`;
  }

  // For extremely cheap items, use scientific notation
  return `${chaosPrice.toExponential(2)}${chaosEmoji}`;
}

/**
 * Format a percentage change with + or - prefix
 */
export function formatPercentChange(change: number, decimals: number = 1): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(decimals)}%`;
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Parse a price string with k/m/b suffix to number
 */
export function parsePriceString(priceStr: string): number {
  const cleaned = priceStr.toLowerCase().trim();

  const match = cleaned.match(/^([\d.]+)([kmb])?$/);
  if (!match) {
    return parseFloat(cleaned) || 0;
  }

  const [, numStr, suffix] = match;
  const num = parseFloat(numStr);

  if (!suffix) return num;

  const multiplier = PRICE_MULTIPLIERS[suffix as keyof typeof PRICE_MULTIPLIERS];
  return num * (multiplier || 1);
}

/**
 * Format a timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: number | string): string {
  const now = Date.now();
  const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Format a date to readable string
 */
export function formatDate(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Truncate text to a specific length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get emoji for price change direction
 */
export function getPriceChangeEmoji(change: number): string {
  if (change > 10) return EMOJIS['uptrend3'];
  if (change > 5) return EMOJIS['uptrend2'];
  if (change > 0) return EMOJIS['uptrend1'];
  if (change === 0) return '➡️';
  if (change > -5) return EMOJIS['downtrend1'];
  if (change > -10) return EMOJIS['downtrend2'];
  return EMOJIS['downtrend3'];
}

/**
 * Get emoji for market sentiment
 */
export function getSentimentEmoji(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case 'very_bullish':
      return EMOJIS['uptrend3'];
    case 'bullish':
      return EMOJIS['uptrend2'];
    case 'neutral':
      return '➡️';
    case 'bearish':
      return EMOJIS['downtrend2'];
    case 'very_bearish':
      return EMOJIS['downtrend3'];
    default:
      return '❓';
  }
}

/**
 * Get emoji for volatility
 */
export function getVolatilityEmoji(volatility: string): string {
  switch (volatility.toLowerCase()) {
    case 'high':
      return '⚡';
    case 'medium':
      return '📊';
    case 'low':
      return '🔒';
    default:
      return '❓';
  }
}

/**
 * Format currency name for display (capitalize properly)
 */
export function formatCurrencyName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Create a progress bar string
 */
export function createProgressBar(value: number, max: number, length: number = 10): string {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
