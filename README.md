# PoE2 Discord Economy Bot

A Discord bot that provides real-time Path of Exile 2 economy information through slash commands, powered by poe.ninja data.

## Features

- **Real-time Price Data**: Get current prices for any PoE2 currency
- **Price Comparisons**: Compare exchange rates between currencies
- **Market Movers**: Track biggest gainers and losers
- **Search**: Find currencies by name with autocomplete
- **Market Trends**: View overall market sentiment and statistics
- **Multi-League Support**: Support for all PoE2 leagues (Dawn, Standard, etc.)
- **Server Preferences**: Set default league per Discord server

## Commands

| Command | Description |
|---------|-------------|
| `/price [currency] [league]` | Get current price for a currency |
| `/compare [currency1] [currency2] [league]` | Compare two currencies |
| `/movers [type] [league] [limit]` | Show biggest price movers |
| `/search [query] [league]` | Search for currencies |
| `/league list` | View available leagues |
| `/league set [league]` | Set server default league |
| `/trends [league]` | View market overview |
| `/chart [currency] [timeframe] [league]` | Generate price chart (coming soon) |
| `/help` | Show help information |

## Setup

### Prerequisites

- Node.js 18+
- Redis server
- Discord Bot Token

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd PoE-Data
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_test_guild_id_here

# Redis Configuration (if not using localhost)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Bot Configuration
DEFAULT_LEAGUE=Rise of the Abyssal
```

4. **Deploy slash commands**

For development (instant updates in test server):
```bash
npm run deploy-commands
```

For production (global, takes ~1 hour):
```bash
npm run deploy-commands:prod
```

5. **Start the bot**

Development mode with auto-restart:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Create `.env` file with your credentials
2. Run with Docker Compose:

```bash
docker-compose up -d
```

This will start both the bot and Redis server.

### Using Docker Only

Build and run:
```bash
docker build -t poe2-discord-bot .
docker run -d --env-file .env poe2-discord-bot
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token to your `.env` file
5. Enable the following intents:
   - Server Members Intent (optional)
   - Message Content Intent (optional)
6. Generate invite URL with these permissions:
   - `applications.commands` (slash commands)
   - `bot` with permissions: `2147485696`
7. Invite the bot to your server

## Project Structure

```
poe2-discord-bot/
├── src/
│   ├── commands/          # Slash command implementations
│   ├── config/            # Configuration and constants
│   ├── events/            # Discord event handlers
│   ├── models/            # TypeScript interfaces
│   ├── services/          # Business logic (API, cache, etc.)
│   ├── utils/             # Utility functions
│   ├── bot.ts             # Discord client setup
│   └── index.ts           # Entry point
├── deploy-commands.ts     # Command deployment script
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Features Roadmap

- [x] Price command with autocomplete
- [x] Currency comparison
- [x] Market movers
- [x] Search functionality
- [x] League management
- [x] Market trends
- [ ] Price history charts
- [ ] Price alerts
- [ ] User watchlists
- [ ] Arbitrage detection
- [ ] Web dashboard

## Data Source

Data is sourced from [poe.ninja](https://poe.ninja) using a dual-approach system:
- Primary: API requests
- Fallback: Browser scraping with Puppeteer

Data is cached in Redis with 5-minute refresh intervals.

## Rate Limiting

- **poe.ninja**: 12 requests per 5 minutes (shared across bot)
- **Discord**: 5 commands per 5 seconds per user (built-in)
- **Commands**: Individual cooldowns (3-15 seconds)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

## Acknowledgments

- Data powered by [poe.ninja](https://poe.ninja)
- Built with [discord.js](https://discord.js.org/)
