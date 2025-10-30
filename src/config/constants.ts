// League constants
export const LEAGUES = {
  POE2: ['Dawn', 'Standard', 'Rise of the Abyssal', 'abyss'] as const,
  POE1: ['Affliction', 'Standard', 'Hardcore'] as const
};

export type POE2League = typeof LEAGUES.POE2[number];
export type POE1League = typeof LEAGUES.POE1[number];

// League name to URL slug mapping
// poe.ninja uses lowercase URL slugs, and some leagues have different display vs URL names
export const LEAGUE_URL_SLUGS: Record<string, string> = {
  // PoE2 leagues
  'Dawn': 'dawn',
  'Standard': 'standard',
  'Rise of the Abyssal': 'abyss',
  'abyss': 'abyss',

  // PoE1 leagues (for future use)
  'Affliction': 'affliction',
  'Hardcore': 'hardcore'
} as const;

// League name to API name mapping for PoE2 direct API
// The PoE2 API uses different league names than the display names
export const POE2_API_LEAGUE_NAMES: Record<string, string> = {
  'Dawn': 'Dawn of the Hunt',
  'Standard': 'Standard',
  'Rise of the Abyssal': 'Rise of the Abyssal',
  'abyss': 'Rise of the Abyssal'
} as const;

// Hardcoded PoE2 currency list for fast autocomplete
// Organized by category for easy maintenance
export const POE2_CURRENCIES = [
  // Premium/Rare Currency
  'Mirror of Kalandra',
  'Divine Orb',
  'Exalted Orb',

  // Common Currency
  'Chaos Orb',
  'Regal Orb',
  'Orb of Alchemy',
  'Orb of Scouring',
  'Orb of Annulment',
  'Orb of Regret',
  'Blessed Orb',
  'Vaal Orb',

  // Basic Currency
  'Orb of Transmutation',
  'Orb of Augmentation',
  'Orb of Alteration',
  'Scroll of Wisdom',
  'Portal Scroll',

  // Quality Currency
  'Armourer\'s Scrap',
  'Blacksmith\'s Whetstone',
  'Gemcutter\'s Prism',
  'Glassblower\'s Bauble',

  // Socket Currency
  'Chromatic Orb',
  'Jeweller\'s Orb',
  'Orb of Fusing',

  // Shards
  'Transmutation Shard',
  'Alteration Shard',
  'Alchemy Shard',
  'Regal Shard',
  'Chaos Shard',
  'Exalted Shard',
  'Divine Shard',
  'Mirror Shard',

  // Special Currency
  'Orb of Unmaking',
  'Orb of Horizons',
  'Orb of Chance',
  'Engineer\'s Orb',
  'Harbinger\'s Orb',

  // Essences (if applicable in PoE2)
  'Essence of Greed',
  'Essence of Envy',
  'Essence of Wrath',
  'Essence of Contempt',
  'Essence of Hatred',
  'Essence of Scorn',
  'Essence of Sorrow',
  'Essence of Rage',
  'Essence of Suffering',
  'Essence of Anguish',
  'Essence of Loathing',
  'Essence of Zeal',
  'Essence of Misery',
  'Essence of Dread',
  'Essence of Torment',
  'Essence of Fear',

  // Catalyst (if applicable)
  'Abrasive Catalyst',
  'Accelerating Catalyst',
  'Fertile Catalyst',
  'Imbued Catalyst',
  'Intrinsic Catalyst',
  'Noxious Catalyst',
  'Prismatic Catalyst',
  'Tempering Catalyst',
  'Turbulent Catalyst',
  'Unstable Catalyst',

  // Other
  'Orb of Dominance',
  'Sacred Orb',
  'Veiled Orb',
  'Tainted Chromatic Orb',
  'Tainted Orb of Fusing',
  'Tainted Jeweller\'s Orb'
] as const;

export type POE2Currency = typeof POE2_CURRENCIES[number];

// Popular currencies to fetch in scheduled task (high-volume, frequently queried)
export const SCHEDULED_FETCH_CURRENCIES = [
  'Mirror of Kalandra',
  'Divine Orb',
  'Exalted Orb',
  'Chaos Orb',
  'Regal Orb',
  'Orb of Alchemy',
  'Orb of Annulment',
  'Vaal Orb',
  'Gemcutter\'s Prism',
  'Orb of Fusing',
  'Chromatic Orb',
  'Blessed Orb',
  'Orb of Scouring',
  'Orb of Regret',
  'Jeweller\'s Orb'
] as const;

// Scheduled task configuration
export const SCHEDULED_TASKS = {
  PRICE_FETCH_CRON: '5 * * * *',  // Run at :05 past every hour
  PRICE_FETCH_ENABLED: true,       // Toggle scheduled fetching
  FETCH_ALL_CURRENCIES: false      // If true, fetch all currencies; if false, fetch only SCHEDULED_FETCH_CURRENCIES
} as const;

// Cache TTL values (in seconds)
// Note: GGG provides currency data in hourly chunks (max 1 hour delay)
export const CACHE_TTL = {
  CURRENCY_DATA: 3600,    // 1 hour (aligned with GGG update frequency)
  DISCORD_EMBED: 600,     // 10 minutes (UI freshness)
  CURRENCY_LIST: 3600,    // 1 hour (currencies rarely change)
  MOVERS: 1800,          // 30 minutes (expensive calculation)
  CHART: 1800,           // 30 minutes (expensive generation)
  PRICE_HISTORY: 2592000 // 30 days (Redis Streams retention)
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

// Discord limits
export const DISCORD_LIMITS = {
  EMBED_FIELD_VALUE_MAX: 1024,
  EMBED_DESCRIPTION_MAX: 4096,
  EMBED_TITLE_MAX: 256,
  EMBED_TOTAL_MAX: 6000,
  INTERACTION_TIMEOUT: 900000 // 15 minutes in ms (Discord max)
} as const;

// Pagination limits
export const PAGINATION = {
  MAX_MOVERS: 20,
  DEFAULT_MOVERS: 10,
  MOVERS_PER_PAGE: 5, // Number of movers to show per page in paginated view
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
