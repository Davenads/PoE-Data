import { LEAGUES, TIMEFRAMES, PAGINATION, LEAGUE_URL_SLUGS } from '../config/constants';
import type { Timeframe } from '../config/constants';

/**
 * Validate if a league name is valid
 */
export function isValidLeague(league: string): boolean {
  const allLeagues = [...LEAGUES.POE2, ...LEAGUES.POE1];
  return allLeagues.some(l => l.toLowerCase() === league.toLowerCase());
}

/**
 * Normalize league name to proper format
 */
export function normalizeLeagueName(league: string): string {
  const allLeagues = [...LEAGUES.POE2, ...LEAGUES.POE1];
  const found = allLeagues.find(l => l.toLowerCase() === league.toLowerCase());
  return found || league;
}

/**
 * Convert league name to URL slug for poe.ninja
 * @param league - Display name of the league
 * @returns URL-safe slug for the league
 */
export function getLeagueUrlSlug(league: string): string {
  // First normalize the league name
  const normalized = normalizeLeagueName(league);

  // Look up in the mapping
  const slug = LEAGUE_URL_SLUGS[normalized];

  if (slug) {
    return slug;
  }

  // Fallback: convert to lowercase and replace spaces with dashes
  return normalized.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Validate if a timeframe is valid
 */
export function isValidTimeframe(timeframe: string): timeframe is Timeframe {
  return timeframe in TIMEFRAMES;
}

/**
 * Validate currency name (basic validation)
 */
export function isValidCurrencyName(name: string): boolean {
  // Basic validation: non-empty, reasonable length, no special chars except spaces and apostrophes
  const pattern = /^[a-zA-Z0-9\s'-]{1,50}$/;
  return pattern.test(name);
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate pagination limit
 */
export function validatePaginationLimit(limit: number): number {
  if (limit < 1) return PAGINATION.DEFAULT_MOVERS;
  if (limit > PAGINATION.MAX_MOVERS) return PAGINATION.MAX_MOVERS;
  return Math.floor(limit);
}

/**
 * Sanitize user input (prevent injection attacks)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 100); // Limit length
}

/**
 * Validate Discord snowflake ID
 */
export function isValidSnowflake(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Check if a string is a valid number
 */
export function isNumeric(value: string): boolean {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}

/**
 * Validate threshold value for alerts
 */
export function isValidThreshold(value: number): boolean {
  return isFinite(value) && value > 0 && value < 1000000;
}

/**
 * Validate alert condition
 */
export function isValidAlertCondition(condition: string): boolean {
  const validConditions = ['above', 'below', 'change_above', 'change_below'];
  return validConditions.includes(condition.toLowerCase());
}

/**
 * Check if a timestamp is recent (within last N minutes)
 */
export function isRecentTimestamp(timestamp: number, minutesAgo: number = 10): boolean {
  const now = Date.now();
  const diff = now - timestamp;
  return diff < minutesAgo * 60 * 1000;
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(required: string[]): string[] {
  return required.filter(key => !process.env[key]);
}
