import { EMOJIS } from '../config/emojis';
import { logger } from './logger';

/**
 * Normalize currency name to emoji key format
 * Converts "Divine Orb" -> "divine", "Greater Exalted Orb" -> "exalted"
 * Handles prefixes like "Greater", "Perfect", "Lesser" and suffixes like "Orb"
 */
export function normalizeCurrencyName(currencyName: string): string {
  // Convert to lowercase and replace spaces with hyphens
  let normalized = currencyName.toLowerCase().replace(/\s+/g, '-');

  // First, try exact match
  if (EMOJIS[normalized]) {
    return normalized;
  }

  // Remove common prefixes (Greater, Perfect, Lesser)
  const prefixesToStrip = ['greater-', 'perfect-', 'lesser-'];
  for (const prefix of prefixesToStrip) {
    if (normalized.startsWith(prefix)) {
      const withoutPrefix = normalized.substring(prefix.length);
      // Try without prefix
      if (EMOJIS[withoutPrefix]) {
        return withoutPrefix;
      }
      // Continue normalization with prefix removed
      normalized = withoutPrefix;
      break;
    }
  }

  // Try removing common suffixes to find base name
  const suffixesToStrip = [
    '-orb',
    '-shard',
    '-catalyst',
    '-prism',
    '-bauble',
    '-whetstone',
    '-scrap',
    '-etcher'
  ];

  for (const suffix of suffixesToStrip) {
    if (normalized.endsWith(suffix)) {
      const withoutSuffix = normalized.substring(0, normalized.length - suffix.length);
      if (EMOJIS[withoutSuffix]) {
        return withoutSuffix;
      }
    }
  }

  // Special cases for specific currency mappings
  const specialMappings: { [key: string]: string } = {
    'divine-orb': 'divine',
    'exalted-orb': 'exalted',
    'chaos-orb': 'chaos',
    'mirror-of-kalandra': 'mirror',
    'regal-orb': 'regal',
    'orb-of-alchemy': 'alch',
    'orb-of-chance': 'chance',
    'orb-of-transmutation': 'transmute',
    'orb-of-augmentation': 'aug',
    'orb-of-annulment': 'annul',
    'vaal-orb': 'vaal',
    'gemcutters-prism': 'gcp',
    'gemcutter\'s-prism': 'gcp',
    'glassblowers-bauble': 'bauble',
    'glassblower\'s-bauble': 'bauble',
    'blacksmiths-whetstone': 'whetstone',
    'blacksmith\'s-whetstone': 'whetstone',
    'armourers-scrap': 'scrap',
    'armourer\'s-scrap': 'scrap',
    'arcanists-etcher': 'etcher',
    'arcanist\'s-etcher': 'etcher',
    'scroll-of-wisdom': 'wisdom',
    'jewellers-orb': 'jewellers-orb',
    'jeweller\'s-orb': 'jewellers-orb',
    'greater-jewellers-orb': 'greater-jewellers-orb',
    'greater-jeweller\'s-orb': 'greater-jewellers-orb',
    'lesser-jewellers-orb': 'lesser-jewellers-orb',
    'lesser-jeweller\'s-orb': 'lesser-jewellers-orb',
    'perfect-jewellers-orb': 'perfect-jewellers-orb',
    'perfect-jeweller\'s-orb': 'perfect-jewellers-orb',
    'artificers-orb': 'artificers',
    'artificer\'s-orb': 'artificers',
    'artificers-shard': 'artificers-shard',
    'artificer\'s-shard': 'artificers-shard',
    'fracturing-orb': 'fracturing-orb',
    'hinekoras-lock': 'hinekoras-lock',
    'hinekora\'s-lock': 'hinekoras-lock'
  };

  if (specialMappings[normalized]) {
    return specialMappings[normalized];
  }

  return normalized;
}

/**
 * Get emoji for a currency with fallback and logging
 * Returns empty string if not found
 */
export function getCurrencyEmoji(currencyName: string): string {
  const normalizedKey = normalizeCurrencyName(currencyName);
  const emoji = EMOJIS[normalizedKey];

  if (!emoji) {
    logger.warn(`[Emoji] No emoji found for currency: "${currencyName}" (normalized: "${normalizedKey}")`);
    return '';
  }

  return emoji;
}

/**
 * Format currency name with emoji prefix
 * Returns "🪙 Divine Orb" or just "Divine Orb" if no emoji found
 */
export function formatCurrencyWithEmoji(currencyName: string): string {
  const emoji = getCurrencyEmoji(currencyName);
  return emoji ? `${emoji} ${currencyName}` : currencyName;
}
