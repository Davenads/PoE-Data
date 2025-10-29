# PoE2 Economy Discord Bot - Project Plan

## Development Guidelines

### Git Commit Messages
- Keep commit messages concise and descriptive
- Use conventional commit format: `type: description`
- DO NOT include author attribution (no "Co-Authored-By" or "Generated with Claude Code")
- DO NOT add emojis to commit messages
- Example: `feat: add loading messages for data-fetching commands`

### Code Changes
- Always wait for user approval before committing and pushing changes
- Build and test locally before committing
- Never push directly after making changes - wait for QA confirmation

---

## Executive Summary
A Discord bot that provides Path of Exile 2 economy information through slash commands, leveraging real-time data scraped from poe.ninja. Built with discord.js following best practices for modularity, scalability, and maintainability.

---

## Current Scraping Implementation Analysis

### Data Collection Strategy
The existing `poeflip` codebase successfully scrapes PoE2 data using a **dual-approach system**:

#### 1. Primary Method: API Requests
- **Endpoint**: `https://poe.ninja/api/data/currencyoverview?league={league}&type=Currency`
- **Headers**: Custom User-Agent for identification
- **Timeout**: 10 seconds
- **Rate Limiting**: 12 requests per 5 minutes (managed via Redis)
- **Status**: Works for PoE1, limited for PoE2 early access

#### 2. Fallback Method: Browser Scraping (Puppeteer)
- **Target URL**: `https://poe.ninja/poe2/economy/{league}/currency`
- **Method**: Headless browser automation with Puppeteer
- **Strategy**:
  - Navigates to PoE2 economy page
  - Waits for React rendering (3s delay + networkidle0)
  - Extracts data from table rows using DOM parsing
  - Identifies currencies by keywords (Orb, Catalyst, Mirror, etc.)
  - Parses chaos values with k/m/b multipliers
  - Extracts volume/hour data from table cells
- **Status**: Successfully scrapes PoE2 data during early access

#### 3. Data Structure
```typescript
interface CurrencyData {
  currencyTypeName: string;          // "Divine Orb", "Mirror of Kalandra"
  chaosEquivalent: number;           // Price in chaos orbs
  paySparkLine: {
    data: number[];
    totalChange: number;             // % change (short-term)
  };
  receiveSparkLine: {
    data: number[];
    totalChange: number;
  };
  pay: {
    count: number;
    value: number;
    listing_count: number;           // Market liquidity
    sample_time_utc: string;
  };
}
```

#### 4. Redis Storage Architecture
- **Current Prices**: `currency:{league}:{currency}:current` (TTL: 5 minutes)
- **Price History**: `prices:stream:{league}:{currency}` (Redis Streams, 30-day retention)
- **Rate Limiting**: `ratelimit:poeninja:{endpoint}` (TTL: 5 minutes)
- **Indicators**: `indicators:{league}:{currency}:analytics` (TTL: 10 minutes)

#### 5. Supported Leagues
- **PoE2 Leagues**: "Dawn", "Rise of the Abyssal", "Standard", "abyss" (URL format)
- Auto-detection for new leagues

---

## Discord Bot Architecture

### Technology Stack
- **Framework**: discord.js v14+ (latest stable)
- **Language**: TypeScript (for type safety and maintainability)
- **Cache Layer**: Redis (ioredis) - reuse existing implementation
- **Data Source**: Existing scraping services (PoeNinjaClient, SimpleBrowserScraper)
- **Rate Limiting**: Discord API + poe.ninja (via existing RateLimitManager)

### Core Design Principles
1. **Modularity**: Separate concerns (commands, services, utils, types)
2. **Scalability**: Support multiple servers with shared cache
3. **Maintainability**: Clear file structure, TypeScript interfaces
4. **Reliability**: Error handling, graceful degradation
5. **Performance**: Redis caching, deferred replies for long operations

---

## Project Structure

```
poe2-discord-bot/
├── src/
│   ├── index.ts                    # Bot initialization & startup
│   ├── bot.ts                      # Discord client configuration
│   ├── commands/                   # Slash command handlers
│   │   ├── index.ts                # Command registry/loader
│   │   ├── price.ts                # /price command
│   │   ├── compare.ts              # /compare command
│   │   ├── chart.ts                # /chart command
│   │   ├── movers.ts               # /movers command
│   │   ├── search.ts               # /search command
│   │   ├── league.ts               # /league command
│   │   ├── alert.ts                # /alert command (future)
│   │   ├── trends.ts               # /trends command
│   │   └── help.ts                 # /help command
│   ├── services/                   # Business logic
│   │   ├── poe-ninja-client.ts     # [EXISTING] API/scraping client
│   │   ├── redis-store.ts          # [EXISTING] Redis data layer
│   │   ├── rate-limiter.ts         # [EXISTING] Rate limit manager
│   │   ├── data-validator.ts       # [EXISTING] Data validation
│   │   ├── currency-analyzer.ts    # [EXISTING] Analysis engine
│   │   ├── embed-builder.ts        # Discord embed formatting
│   │   ├── chart-generator.ts      # Chart image generation
│   │   └── cache-manager.ts        # Discord-specific caching
│   ├── models/
│   │   ├── types.ts                # [EXISTING] TypeScript interfaces
│   │   └── command.interface.ts    # Command structure interface
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   ├── formatters.ts           # Number/text formatting
│   │   └── validators.ts           # Input validation
│   ├── events/                     # Discord event handlers
│   │   ├── ready.ts                # Bot ready event
│   │   ├── interactionCreate.ts    # Slash command handler
│   │   └── error.ts                # Error handling
│   └── config/
│       ├── config.ts               # Configuration management
│       └── constants.ts            # Constants and enums
├── deploy-commands.ts              # Command deployment script
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Slash Commands Specification

### 1. `/price [currency] [league?]`
**Description**: Get the current price of a specific currency

**Parameters**:
- `currency` (required): Currency name (autocomplete enabled)
- `league` (optional): League name (defaults to "Dawn")

**Response**:
```
📊 Divine Orb (Dawn)
━━━━━━━━━━━━━━━━━━━━━━
💰 Price: 143.5 Chaos Orbs
📈 24h Change: +12.3% (📈 Bullish)
📦 Listings: 1,254
🕐 Updated: 2 minutes ago
```

**Features**:
- Real-time pricing from cache
- Price change indicators
- Market liquidity info
- Autocomplete for currency names

---

### 2. `/compare [currency1] [currency2] [league?]`
**Description**: Compare prices and ratios between two currencies

**Parameters**:
- `currency1` (required): First currency
- `currency2` (required): Second currency
- `league` (optional): League name

**Response**:
```
⚖️ Divine Orb vs Exalted Orb (Dawn)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Divine Orb: 143.5 chaos
Exalted Orb: 28.7 chaos

💱 Ratio: 1 Divine = 5.0 Exalted
📊 Better performer: Divine Orb (+12.3% vs +8.1%)
```

---

### 3. `/movers [type?] [league?] [limit?]`
**Description**: Show biggest price movers (gainers/losers)

**Parameters**:
- `type` (optional): "gainers" | "losers" | "all" (default: all)
- `league` (optional): League name
- `limit` (optional): Number of results (1-20, default: 10)

**Response**:
```
🚀 Top Movers - Dawn League
━━━━━━━━━━━━━━━━━━━━━━━━

📈 GAINERS:
1. Regal Orb: +34.2% (45.3c → 60.8c)
2. Gemcutter's Prism: +28.5% (12.1c → 15.5c)
3. Vaal Orb: +21.3% (8.5c → 10.3c)

📉 LOSERS:
1. Chaos Orb: -15.2% (1.0c → 0.85c)
2. Orb of Alchemy: -8.4% (2.3c → 2.1c)
```

---

### 4. `/chart [currency] [timeframe?] [league?]`
**Description**: Generate a price chart for a currency

**Parameters**:
- `currency` (required): Currency name
- `timeframe` (optional): "1h" | "6h" | "24h" | "7d" | "30d" (default: 24h)
- `league` (optional): League name

**Response**:
- Embedded image with price chart (using chart.js or similar)
- Price range (high/low)
- Average price
- Volatility indicator

**Technical Notes**:
- Generate charts server-side using canvas or chart libraries
- Cache generated charts for 5-10 minutes
- Support dark theme for Discord

---

### 5. `/search [query] [league?]`
**Description**: Search for currencies by name

**Parameters**:
- `query` (required): Search term (partial match)
- `league` (optional): League name

**Response**:
```
🔍 Search Results for "orb" (Dawn)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 8 currencies:
1. Divine Orb - 143.5c (+12.3%)
2. Exalted Orb - 28.7c (+8.1%)
3. Chaos Orb - 1.0c (±0.0%)
4. Vaal Orb - 10.3c (+21.3%)
...

Use /price [currency] for details
```

---

### 6. `/league [command] [league?]`
**Description**: Manage league preferences and info

**Sub-commands**:
- `/league list` - Show available leagues
- `/league set [league]` - Set default league for server
- `/league info [league]` - League statistics and info

**Response (list)**:
```
🌍 Available PoE2 Leagues
━━━━━━━━━━━━━━━━━━━━━━

🔴 Dawn (Current)
   └─ 3,245 currencies tracked

⚫ Standard
   └─ 2,891 currencies tracked

🟣 Rise of the Abyssal (Ended)
   └─ Historical data available

Current server default: Dawn
```

---

### 7. `/trends [league?]`
**Description**: Market overview and trends

**Parameters**:
- `league` (optional): League name

**Response**:
```
📊 Market Trends - Dawn League
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Most Active (24h):
Divine Orb (1.2M listings/day)

💎 Most Valuable:
Mirror of Kalandra (31,000c)

📈 Market Sentiment: Bullish
Average 24h change: +5.2%

⚡ Volatility Index: Medium
Top 10 currencies avg volatility: 18.3%
```

---

### 8. `/alert create [currency] [condition] [value] [league?]` *(Future Feature)*
**Description**: Create price alerts (DM notifications)

**Parameters**:
- `currency` (required): Currency to monitor
- `condition` (required): "above" | "below" | "change_above" | "change_below"
- `value` (required): Threshold value
- `league` (optional): League name

**Example**: `/alert create "Divine Orb" above 150 Dawn`

**Note**: Requires persistent storage (add alerts table to Redis or use SQLite)

---

### 9. `/help [command?]`
**Description**: Show help information

**Parameters**:
- `command` (optional): Specific command to get help for

**Response**:
```
📚 PoE2 Economy Bot Commands
━━━━━━━━━━━━━━━━━━━━━━━━━

/price - Get currency prices
/compare - Compare two currencies
/movers - Top price movers
/chart - Price history charts
/search - Search currencies
/league - League management
/trends - Market overview
/help - This message

Data powered by poe.ninja
Updates every 5 minutes
```

---

## Discord.js Best Practices Implementation

### 1. Command Handler Pattern
```typescript
// src/models/command.interface.ts
import {
  SlashCommandBuilder,
  CommandInteraction,
  AutocompleteInteraction
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
```

### 2. Event-Driven Architecture
```typescript
// src/events/interactionCreate.ts
import { Interaction } from 'discord.js';
import { commands } from '../commands';

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Error executing command!',
        ephemeral: true
      });
    }
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (command?.autocomplete) {
      await command.autocomplete(interaction);
    }
  }
}
```

### 3. Deferred Replies for Long Operations
```typescript
// Example: /chart command (takes time to generate image)
async execute(interaction: CommandInteraction) {
  // Acknowledge immediately (prevents "Application did not respond")
  await interaction.deferReply();

  try {
    const chart = await generateChart(currency, timeframe);

    // Edit the deferred reply with actual content
    await interaction.editReply({
      embeds: [embed],
      files: [chart]
    });
  } catch (error) {
    await interaction.editReply('Failed to generate chart.');
  }
}
```

### 4. Autocomplete for Currency Names
```typescript
async autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const league = interaction.options.getString('league') || 'Dawn';

  // Get cached currency list
  const currencies = await getCachedCurrencyList(league);

  // Filter and return matches
  const filtered = currencies
    .filter(c => c.toLowerCase().includes(focusedValue.toLowerCase()))
    .slice(0, 25); // Discord limit

  await interaction.respond(
    filtered.map(name => ({ name, value: name }))
  );
}
```

### 5. Error Handling
```typescript
// Global error handler
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

// Discord client error handler
client.on('error', (error) => {
  logger.error('Discord client error:', error);
});

// Command-level error handling with user feedback
try {
  await interaction.deferReply();
  // ... command logic
} catch (error) {
  logger.error(`Error in ${interaction.commandName}:`, error);

  const errorMessage = error instanceof Error
    ? error.message
    : 'An unknown error occurred';

  await interaction.editReply({
    content: `❌ Error: ${errorMessage}`,
    embeds: []
  });
}
```

### 6. Command Deployment Strategy
```typescript
// deploy-commands.ts
import { REST, Routes } from 'discord.js';
import { commands } from './src/commands';

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('Deploying slash commands...');

    const commandData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());

    // For development: Guild-specific (instant updates)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commandData }
    );

    // For production: Global commands (takes ~1 hour to propagate)
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commandData }
    );

    console.log('✅ Commands deployed successfully');
  } catch (error) {
    console.error(error);
  }
})();
```

---

## Redis Caching Strategy for Discord Bot

### Cache Layers

#### Layer 1: Currency Data (Existing)
- **Source**: `poeflip` Redis store
- **Keys**: `currency:{league}:{currency}:current`
- **TTL**: 5 minutes (with jitter)
- **Purpose**: Raw price data from poe.ninja

#### Layer 2: Discord-Specific Cache
```typescript
interface DiscordCacheStrategy {
  // Pre-formatted embeds (saves computation)
  'discord:embed:{league}:{currency}': {
    ttl: 120,  // 2 minutes
    data: 'MessageEmbed JSON'
  },

  // Currency autocomplete list (heavy query)
  'discord:currencies:{league}:list': {
    ttl: 300,  // 5 minutes
    data: 'string[]'
  },

  // Movers calculation (expensive)
  'discord:movers:{league}:{type}': {
    ttl: 180,  // 3 minutes
    data: 'MoverData[]'
  },

  // Generated charts (image buffers)
  'discord:chart:{league}:{currency}:{timeframe}': {
    ttl: 600,  // 10 minutes
    data: 'base64 image'
  },

  // Server preferences
  'discord:server:{guild_id}:league': {
    ttl: -1,  // Persistent
    data: 'string (league name)'
  }
}
```

#### Layer 3: In-Memory Cache
```typescript
// For ultra-hot data (e.g., autocomplete lists)
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
}
```

### Cache Warming Strategy
```typescript
// Warm cache on bot startup
async warmCache() {
  const leagues = ['Dawn', 'Standard'];

  for (const league of leagues) {
    // Pre-fetch currency lists
    await this.getCurrencyList(league);

    // Pre-calculate movers
    await this.getTopMovers(league, 'gainers', 10);
    await this.getTopMovers(league, 'losers', 10);

    console.log(`✅ Cache warmed for ${league}`);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal**: Basic bot with core commands

- [ ] Project setup with TypeScript + discord.js
- [ ] Integrate existing scraping services (PoeNinjaClient, RedisDataStore)
- [ ] Implement command handler pattern
- [ ] Deploy commands infrastructure
- [ ] Implement `/price` command
- [ ] Implement `/help` command
- [ ] Basic error handling
- [ ] Configuration management (.env)

**Deliverable**: Bot responds to `/price` and `/help` with real data

---

### Phase 2: Core Commands (Week 2)
**Goal**: Expand command functionality

- [ ] Implement `/compare` command
- [ ] Implement `/movers` command
- [ ] Implement `/search` command with autocomplete
- [ ] Implement `/league` command (list, set, info)
- [ ] Create embed builder service
- [ ] Add Discord-specific Redis caching layer
- [ ] Improve error messages and user feedback

**Deliverable**: 6 fully functional commands with good UX

---

### Phase 3: Advanced Features (Week 3)
**Goal**: Charts and analytics

- [ ] Implement `/chart` command
- [ ] Integrate chart generation library (chart.js + canvas)
- [ ] Implement `/trends` command
- [ ] Add market sentiment analysis
- [ ] Optimize caching strategy (cache warming)
- [ ] Add rate limiting for Discord commands
- [ ] Implement command cooldowns

**Deliverable**: Visual charts and market analytics

---

### Phase 4: Polish & Optimization (Week 4)
**Goal**: Production-ready

- [x] Comprehensive error handling
- [x] Logging system (Winston)
- [ ] Performance monitoring
- [ ] Command usage analytics
- [x] Deployment documentation
- [ ] Bot status dashboard (optional)
- [ ] Unit tests for critical functions

**Deliverable**: Production-ready Discord bot

---

### Phase 5: Future Enhancements (Post-Launch)
- [ ] `/alert` command with persistent storage
- [ ] User-specific watchlists
- [ ] Arbitrage opportunity detection commands
- [ ] Multi-league comparison commands
- [ ] Admin commands (force refresh, stats)
- [ ] Web dashboard integration
- [ ] Historical data export commands

---

## Technical Specifications

### Environment Variables
```env
# Discord
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_test_guild_id  # For development

# Redis (existing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Bot Configuration
DEFAULT_LEAGUE=Dawn
UPDATE_INTERVAL_MINUTES=5
ENABLE_AUTOCOMPLETE=true
CHART_CACHE_DURATION=600
```

### Dependencies
```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "ioredis": "^5.7.0",
    "axios": "^1.12.2",
    "puppeteer": "^24.22.0",
    "typescript": "^5.9.2",
    "dotenv": "^17.2.2",
    "winston": "^3.11.0",
    "chart.js": "^4.4.1",
    "canvas": "^2.11.2",
    "@types/node": "^24.5.2"
  },
  "devDependencies": {
    "@types/discord.js": "^14.0.0",
    "ts-node": "^10.9.2",
    "nodemon": "^3.1.10"
  }
}
```

### Scripts
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "deploy-commands": "ts-node deploy-commands.ts",
    "deploy-commands:prod": "ts-node deploy-commands.ts --production",
    "lint": "eslint src/**/*.ts",
    "test": "jest"
  }
}
```

---

## Discord Bot Setup Guide

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "PoE2 Economy Bot"
4. Navigate to "Bot" section
5. Click "Reset Token" → Copy token to .env
6. Enable "Message Content Intent" (if needed for future features)
7. Disable "Public Bot" (optional, for private use)

### 2. Invite Bot to Server
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147485696&scope=bot%20applications.commands
```

**Required Permissions**:
- Send Messages
- Embed Links
- Attach Files
- Use Slash Commands

### 3. Deploy Commands
```bash
# Development (guild-specific, instant updates)
npm run deploy-commands

# Production (global, 1-hour propagation)
npm run deploy-commands:prod
```

### 4. Run Bot
```bash
# Development (with auto-restart)
npm run dev

# Production
npm run build
npm start
```

---

## Rate Limiting Considerations

### poe.ninja Rate Limits (Existing)
- **Limit**: 12 requests per 5 minutes
- **Implementation**: Managed by `RateLimitManager`
- **Strategy**: Shared across bot instances via Redis

### Discord Rate Limits
- **Slash Commands**: 5 per 5 seconds per user
- **Implementation**: Built-in by Discord.js
- **Additional**: Command-level cooldowns (optional)

```typescript
// Command cooldown implementation
const cooldowns = new Map<string, Map<string, number>>();

function checkCooldown(userId: string, commandName: string, cooldownSeconds: number): boolean {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();
  const cooldownAmount = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return false; // Still on cooldown
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return true; // Cooldown passed
}
```

---

## Monitoring & Observability

### Logging Strategy
```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Metrics to Track
- Commands used per hour/day
- Cache hit/miss rates
- Average response times
- Error rates by command
- poe.ninja API success rates
- Discord API latency

### Health Check Endpoint (Optional)
```typescript
// Simple HTTP health check for monitoring
import http from 'http';

const healthCheckServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      discord: client.isReady(),
      redis: redisStore.isConnected()
    }));
  }
});

healthCheckServer.listen(3000);
```

---

## Testing Strategy

### Unit Tests
```typescript
// Example: Test currency price formatting
import { formatPrice } from '../utils/formatters';

describe('formatPrice', () => {
  it('should format prices with 2 decimals', () => {
    expect(formatPrice(143.567)).toBe('143.57');
  });

  it('should handle large numbers with k/m/b', () => {
    expect(formatPrice(31000)).toBe('31k');
    expect(formatPrice(1200000)).toBe('1.2m');
  });
});
```

### Integration Tests
```typescript
// Test Redis caching layer
describe('CacheManager', () => {
  it('should cache currency data', async () => {
    const currency = await cacheManager.getCurrency('Dawn', 'Divine Orb');
    expect(currency).toBeDefined();
    expect(currency.currencyTypeName).toBe('Divine Orb');
  });
});
```

### Manual Testing Checklist
- [ ] All commands respond within 3 seconds
- [ ] Autocomplete returns relevant results
- [ ] Charts render correctly on dark theme
- [ ] Error messages are user-friendly
- [ ] Bot handles rate limits gracefully
- [ ] Cache invalidation works correctly
- [ ] Multiple concurrent users don't cause issues

---

## Deployment

### Local/VPS Deployment

The bot runs directly on Node.js with Redis on WSL-Ubuntu (or any Redis server).

**Requirements:**
- Node.js 18+
- Redis server (WSL-Ubuntu, native, or cloud-hosted)
- Windows batch scripts provided for easy management

**Quick Start:**
```bash
# Install dependencies
npm install

# Configure .env file
# (See .env.example for all options)

# Deploy commands to Discord
deploy-commands.bat

# Start bot
dev.bat  # Development (auto-reload)
# or
start.bat  # Production
```

### Cloud Deployment (Heroku, Railway, Render)

**For Heroku:**
1. Add Redis add-on (Heroku Redis or Redis Cloud)
2. Set environment variables via dashboard
3. Add Puppeteer buildpack:
   ```bash
   heroku buildpacks:add jontewks/puppeteer
   heroku buildpacks:add heroku/nodejs
   ```
4. Create `Procfile`:
   ```
   worker: node dist/src/index.js
   ```
5. Deploy: `git push heroku main`

**For Railway/Render:**
- Add Redis plugin/service
- Set environment variables
- Deploy via GitHub integration
- Use start command: `npm start`

### Deployment Checklist
- [x] Environment variables configured (.env)
- [x] Redis connection configured (WSL or cloud)
- [x] Bot token secured
- [x] Commands deployed to production
- [x] Logging configured (Winston)
- [ ] Monitoring/alerting set up
- [ ] Backup strategy in place
- [ ] Bot invited to target servers

---

## Security Considerations

1. **Token Security**: Never commit `.env` files
2. **Rate Limiting**: Prevent abuse with cooldowns
3. **Input Validation**: Sanitize user inputs
4. **Error Handling**: Don't expose internal errors to users
5. **Permissions**: Request minimal Discord permissions
6. **Redis Security**: Use password authentication in production
7. **Dependency Updates**: Regular security updates

---

## FAQ & Troubleshooting

### Q: How often is data updated?
**A**: Data is refreshed every 5 minutes via the existing scraper. Discord commands use cached data with 2-5 minute TTLs.

### Q: What if poe.ninja is down?
**A**: Bot will return cached data with a warning. If cache is stale (>10 minutes), bot will show error message.

### Q: Can multiple people use commands at once?
**A**: Yes, Redis caching ensures shared data across all users. No duplicate scraping requests.

### Q: How to add support for new leagues?
**A**: Leagues are auto-detected. Just update the default league in config or use `/league set`.

### Q: Why are charts slow?
**A**: Chart generation takes 2-3 seconds. Bot uses deferred replies to prevent timeout. Charts are cached for 10 minutes.

---

## Questions for Clarification

Before starting implementation, please confirm:

1. **Bot Hosting**: Where will the bot run? (Same machine as scraper, separate VPS, cloud?)
2. **Redis Sharing**: Will bot and scraper share the same Redis instance?
3. **Update Frequency**: Keep 5-minute updates or adjust for Discord use case?
4. **Chart Library**: Preference for chart.js + canvas or alternative (quickchart.io API)?
5. **Scope**: Private bot (single server) or public bot (multi-server)?
6. **Additional Commands**: Any specific commands not listed that you'd like?

---

## Summary

This Discord bot leverages the existing poe.ninja scraping infrastructure to provide real-time PoE2 economy information through intuitive slash commands. By reusing the battle-tested scraping logic and Redis caching layer, development can focus on Discord-specific features and UX.

**Key Advantages**:
- ✅ Proven scraping implementation (API + browser fallback)
- ✅ Robust Redis caching architecture
- ✅ Modular, maintainable codebase
- ✅ Discord.js best practices
- ✅ Scalable to multiple servers
- ✅ Fast responses via multi-layer caching

**Estimated Timeline**: 3-4 weeks for full implementation (Phases 1-4)

Ready to start implementation? 🚀
