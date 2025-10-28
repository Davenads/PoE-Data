# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "PoE2 Economy Bot"
4. Go to "Bot" section → Click "Reset Token" → Copy the token
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent (optional)
   - Message Content Intent (optional)
6. Save your bot token for the next step

## Step 3: Get Client ID

1. In the Discord Developer Portal, go to "OAuth2" → "General"
2. Copy your "Client ID"

## Step 4: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
DISCORD_TOKEN=your_bot_token_from_step_2
DISCORD_CLIENT_ID=your_client_id_from_step_3
DISCORD_GUILD_ID=your_test_server_id  # Right-click server → Copy ID (enable Developer Mode)

# Redis (if using local Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# Bot Settings
DEFAULT_LEAGUE=Dawn
```

## Step 5: Start Redis

If you don't have Redis running:

**Windows (with WSL or Docker):**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Linux/Mac:**
```bash
redis-server
```

Or use the Docker Compose setup (includes Redis):
```bash
docker-compose up -d redis
```

## Step 6: Deploy Commands

For development (instant updates in your test server):
```bash
npm run deploy-commands
```

**Note:** You need DISCORD_GUILD_ID set for this to work.

For production (global commands, takes ~1 hour):
```bash
npm run deploy-commands:prod
```

## Step 7: Invite Bot to Server

1. Go to Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Step 8: Start the Bot

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Step 9: Test the Bot

In your Discord server, type:
```
/help
```

Then try:
```
/price Divine Orb
```

## Troubleshooting

### Commands not showing up
- Make sure you deployed commands (Step 6)
- Wait a few minutes for Discord to register them
- For guild commands, make sure DISCORD_GUILD_ID is correct
- Try kicking and re-inviting the bot

### "Application did not respond"
- Check that Redis is running
- Check bot logs for errors
- Make sure your DISCORD_TOKEN is valid

### Currency not found
- The bot needs to scrape data first (happens on first request)
- Check that poe.ninja is accessible
- Check logs for scraping errors

### Redis connection error
- Make sure Redis is running on localhost:6379
- Check REDIS_HOST and REDIS_PORT in .env
- Test Redis: `redis-cli ping` (should return PONG)

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# Create .env file first (see Step 4)

# Start everything (bot + Redis)
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop
docker-compose down
```

## Next Steps

- Set your server's default league: `/league set Dawn`
- Explore commands: `/help`
- Check market movers: `/movers`
- View trends: `/trends`

## Development Tips

- Use `npm run dev` for hot reload during development
- Check `logs/combined.log` for detailed logs
- Use `logs/error.log` for error debugging
- Commands are in `src/commands/`
- Services are in `src/services/`

## Support

If you encounter issues:
1. Check `logs/error.log`
2. Verify all environment variables are set
3. Make sure Redis is running
4. Check Discord Developer Portal for bot status
5. Verify bot has necessary permissions in your server

Enjoy your PoE2 Economy Bot! 🚀
