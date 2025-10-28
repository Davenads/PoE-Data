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

## Quick Start

### Prerequisites

- Node.js 18+
- Redis on WSL-Ubuntu (or any Redis server)
- Discord Bot Token

### Setup Steps

1. **Configure WSL Redis for Windows access**
```bash
# Run the check script to verify Redis setup
check-redis.bat

# If Redis is not accessible from Windows, configure it:
wsl bash -c "redis-cli -a 'YOUR_REDIS_PASSWORD' CONFIG SET bind '0.0.0.0'"
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
DISCORD_GUILD_ID_TEST=your_test_guild_id_here

# Redis Configuration (WSL-Ubuntu)
# Get your WSL IP with: wsl hostname -I
REDIS_HOST=172.19.187.251  # Your WSL IP
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Bot Configuration
DEFAULT_LEAGUE=Rise of the Abyssal
```

4. **Deploy Discord commands**
```bash
deploy-commands.bat
```

5. **Start the bot**

Development mode (recommended - auto-reload):
```bash
dev.bat
```

Production mode:
```bash
start.bat
```

✅ **That's it!** The bot is now running and will show all logs directly in the console.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `dev.bat` | Start bot in development mode (auto-reload, debug logs) |
| `start.bat` | Build and start bot in production mode |
| `clean-start.bat` | Kill old instances and start fresh (recommended) |
| `kill-bots.bat` | Stop all Node.js processes |
| `deploy-commands.bat` | Register slash commands with Discord |
| `check-redis.bat` | Verify Redis connection and configuration |

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
├── check-redis.bat        # Redis diagnostic tool
├── dev.bat                # Development start script
├── start.bat              # Production start script
└── package.json
```

## Development

### Development Workflow

1. Make code changes in `src/`
2. Save file
3. Bot auto-reloads (if using `dev.bat`)
4. Test immediately in Discord

### Building

```bash
npm run build
```

### NPM Scripts

```bash
npm run dev          # Start in development mode (auto-reload)
npm run build        # Build TypeScript to dist/
npm start            # Start production build
npm run deploy-commands  # Deploy commands to Discord
```

## WSL Redis Setup

### Required Configuration

For the bot to connect from Windows to Redis on WSL, Redis must be configured to accept external connections:

```bash
# Set Redis to bind to all interfaces (allows Windows access)
wsl bash -c "redis-cli -a 'YOUR_PASSWORD' CONFIG SET bind '0.0.0.0'"

# Make it persistent (optional - edit Redis config file)
wsl sudo find /etc -name "redis.conf" -exec sed -i 's/bind 127.0.0.1/bind 0.0.0.0/g' {} \;
wsl sudo service redis-server restart
```

### Redis Management

```bash
# Start Redis
wsl sudo service redis-server start

# Stop Redis
wsl sudo service redis-server stop

# Restart Redis
wsl sudo service redis-server restart

# Check status
wsl sudo service redis-server status

# Test connection
wsl redis-cli -a 'YOUR_PASSWORD' ping
# Should return: PONG
```

### Get WSL IP Address

```bash
wsl hostname -I
# Example output: 172.19.187.251
```

Use this IP in your `.env` file for `REDIS_HOST`.

## Troubleshooting

### Bot won't start - "ECONNREFUSED" error

**Problem:** Can't connect to Redis from Windows.

**Solution:**
1. Run `check-redis.bat` to diagnose
2. Ensure Redis is bound to `0.0.0.0` (see WSL Redis Setup above)
3. Verify WSL IP hasn't changed: `wsl hostname -I`
4. Update `REDIS_HOST` in `.env` if IP changed

### WSL IP address changed

**Problem:** Redis connection fails after restart.

**Solution:**
```bash
# Get new WSL IP
wsl hostname -I

# Update .env with new IP
# Edit REDIS_HOST=<new-ip>
```

### Redis authentication failed

**Problem:** "NOAUTH Authentication required"

**Solution:**
Verify password in `.env` matches Redis config:
```bash
wsl bash -c "redis-cli -a 'YOUR_PASSWORD' --no-auth-warning ping"
# Should return: PONG
```

### "Unknown interaction" errors

**Problem:** Commands time out with "Unknown interaction" error.

**Solution:**
Multiple bot instances are running. Kill all and restart:
```bash
kill-bots.bat
# Then start fresh with:
clean-start.bat
```

**Prevention:**
- Always use **Ctrl+C** to stop the bot properly
- Use `clean-start.bat` instead of `dev.bat` if you're unsure
- Check Task Manager for zombie `node.exe` processes

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

## Deployment

For production deployment, you can use:
- **VPS/Dedicated Server**: Run `start.bat` with a process manager like PM2
- **Cloud Platforms**: Heroku, Railway, Render (all support Node.js + Redis)
- **Keep-alive**: Use a service like UptimeRobot to prevent sleep

### Heroku Deployment Example

1. Add Redis add-on (Heroku Redis or Redis Cloud)
2. Set environment variables via Heroku dashboard
3. Add Puppeteer buildpack:
   ```bash
   heroku buildpacks:add jontewks/puppeteer
   heroku buildpacks:add heroku/nodejs
   ```
4. Create `Procfile`:
   ```
   worker: node dist/src/index.js
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

## Acknowledgments

- Data powered by [poe.ninja](https://poe.ninja)
- Built with [discord.js](https://discord.js.org/)
