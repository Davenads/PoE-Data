// League constants
export const LEAGUES = {
  POE2: ['Dawn', 'Standard', 'Rise of the Abyssal', 'abyss'] as const,
  POE1: ['Affliction', 'Standard', 'Hardcore'] as const
};

export type POE2League = typeof LEAGUES.POE2[number];
export type POE1League = typeof LEAGUES.POE1[number];

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  CURRENCY_DATA: 300, // 5 minutes
  DISCORD_EMBED: 120, // 2 minutes
  CURRENCY_LIST: 300, // 5 minutes
  MOVERS: 180, // 3 minutes
  CHART: 600, // 10 minutes
  PRICE_HISTORY: 2592000 // 30 days
} as const;

// Currency type keywords for scraping
export const CURRENCY_KEYWORDS = [
  'Orb',
  'Catalyst',
  'Mirror',
  'Essence',
  'Exalted',
  'Divine',
  'Chaos',
  'Shard',
  'Fragment',
  'Splinter',
  'Blessing',
  'Oil',
  'Scarab',
  'Resonator',
  'Fossil',
  'Incubator',
  'Vial'
] as const;

// Price multipliers for parsing
export const PRICE_MULTIPLIERS = {
  k: 1000,
  m: 1000000,
  b: 1000000000
} as const;

// Discord embed colors
export const EMBED_COLORS = {
  SUCCESS: 0x57F287,
  ERROR: 0xED4245,
  WARNING: 0xFEE75C,
  INFO: 0x5865F2,
  BULLISH: 0x57F287,
  BEARISH: 0xED4245,
  NEUTRAL: 0x99AAB5
} as const;

// Command cooldowns (in seconds)
export const COMMAND_COOLDOWNS = {
  price: 3,
  compare: 5,
  movers: 10,
  chart: 15,
  search: 3,
  league: 5,
  trends: 10,
  help: 1
} as const;

// Rate limit windows
export const RATE_LIMITS = {
  POE_NINJA_REQUESTS: 12,
  POE_NINJA_WINDOW: 300000, // 5 minutes in ms
  DISCORD_COMMANDS: 5,
  DISCORD_WINDOW: 5000 // 5 seconds in ms
} as const;

// Chart configuration
export const CHART_CONFIG = {
  WIDTH: 800,
  HEIGHT: 400,
  BACKGROUND_COLOR: '#2b2d31',
  GRID_COLOR: 'rgba(255, 255, 255, 0.1)',
  TEXT_COLOR: '#ffffff',
  LINE_COLORS: {
    PRIMARY: '#5865F2',
    SECONDARY: '#57F287',
    TERTIARY: '#FEE75C'
  }
} as const;

// Timeframe options for charts
export const TIMEFRAMES = {
  '1h': { label: '1 Hour', milliseconds: 3600000 },
  '6h': { label: '6 Hours', milliseconds: 21600000 },
  '24h': { label: '24 Hours', milliseconds: 86400000 },
  '7d': { label: '7 Days', milliseconds: 604800000 },
  '30d': { label: '30 Days', milliseconds: 2592000000 }
} as const;

export type Timeframe = keyof typeof TIMEFRAMES;

// Market sentiment thresholds
export const SENTIMENT_THRESHOLDS = {
  VERY_BULLISH: 10,
  BULLISH: 5,
  NEUTRAL: -5,
  BEARISH: -10
} as const;

// Volatility classification
export const VOLATILITY_THRESHOLDS = {
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5
} as const;

// Pagination limits
export const PAGINATION = {
  MAX_MOVERS: 20,
  DEFAULT_MOVERS: 10,
  MAX_SEARCH_RESULTS: 25,
  AUTOCOMPLETE_LIMIT: 25
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CURRENCY_NOT_FOUND: 'Currency not found. Use /search to find available currencies.',
  LEAGUE_NOT_FOUND: 'League not found. Use /league list to see available leagues.',
  NO_DATA_AVAILABLE: 'No data available for this currency/league combination.',
  API_ERROR: 'Failed to fetch data from poe.ninja. Please try again later.',
  RATE_LIMITED: 'Rate limit exceeded. Please wait a moment and try again.',
  INVALID_TIMEFRAME: 'Invalid timeframe. Valid options: 1h, 6h, 24h, 7d, 30d',
  CHART_GENERATION_FAILED: 'Failed to generate chart. Please try again.',
  REDIS_CONNECTION_ERROR: 'Database connection error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LEAGUE_SET: 'Default league set successfully!',
  ALERT_CREATED: 'Price alert created successfully!',
  ALERT_DELETED: 'Price alert deleted successfully!'
} as const;

// API headers
export const API_HEADERS = {
  'User-Agent': 'PoE2-Discord-Bot/1.0.0 (Economy Tracker)',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip, deflate'
} as const;

// Puppeteer configuration
export const PUPPETEER_CONFIG = {
  HEADLESS: true,
  WAIT_FOR_SELECTOR_TIMEOUT: 30000,
  NAVIGATION_TIMEOUT: 30000,
  NETWORK_IDLE_TIMEOUT: 3000
} as const;
