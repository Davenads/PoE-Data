import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  discord: {
    token: string;
    clientId: string;
    guildId?: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  bot: {
    defaultLeague: string;
    updateIntervalMinutes: number;
    enableAutocomplete: boolean;
    chartCacheDuration: number;
  };
  poeNinja: {
    maxRequests: number;
    windowMinutes: number;
    apiUrl: string;
    webUrl: string;
  };
  environment: string;
  logLevel: string;
}

function validateConfig(): void {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file'
    );
  }
}

// Validate configuration on load
validateConfig();

export const config: Config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    guildId: process.env.DISCORD_GUILD_ID
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD
  },
  bot: {
    defaultLeague: process.env.DEFAULT_LEAGUE || 'Dawn',
    updateIntervalMinutes: parseInt(process.env.UPDATE_INTERVAL_MINUTES || '5', 10),
    enableAutocomplete: process.env.ENABLE_AUTOCOMPLETE !== 'false',
    chartCacheDuration: parseInt(process.env.CHART_CACHE_DURATION || '600', 10)
  },
  poeNinja: {
    maxRequests: parseInt(process.env.POE_NINJA_MAX_REQUESTS || '12', 10),
    windowMinutes: parseInt(process.env.POE_NINJA_WINDOW_MINUTES || '5', 10),
    apiUrl: 'https://poe.ninja/api/data',
    webUrl: 'https://poe.ninja'
  },
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
