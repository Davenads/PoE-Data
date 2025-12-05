# PoE2 Economy Bot

Hey, I've built a Discord bot that pulls real-time economy data from poe.ninja for Path of Exile 2. Figured it might be useful for the server.

## What it does

The bot responds to slash commands and gives you current prices, market trends, and comparisons for currencies in PoE2. Data refreshes every 5 minutes from poe.ninja.

## Commands

**`/price [currency] [league]`**
Shows the current chaos price and 24-hour change for any currency.
Example: `/price Divine Orb`

**`/compare [currency1] [currency2] [league]`**
Compares two currencies side by side with exchange rates.
Example: `/compare Divine Orb Exalted Orb`

**`/movers [type] [league] [limit]`**
Shows the biggest price gainers and losers in the last 24 hours.
Types: all, gainers, losers
Example: `/movers gainers`

**`/search [query] [league]`**
Search for currencies by name. Useful when you can't remember the exact name.
Example: `/search essence`

**`/trends [league]`**
Market overview showing most active currencies, most valuable items, and overall sentiment.

**`/chart [currency] [timeframe] [league]`**
Generates a price history chart. (Coming soon)

**`/league`**
View available leagues and server preferences.

**`/help`**
Shows all commands with descriptions.

## Technical details

- Data source: poe.ninja scraping (API + browser fallback)
- Update frequency: 5 minutes
- Supports all current PoE2 leagues (Dawn, Standard, Rise of the Abyssal)
- Hosted on local infrastructure with Redis caching

## Permissions needed

The bot only needs:
- Send Messages
- Embed Links
- Attach Files (for future chart feature)
- Use Slash Commands
- Use External Emojis (to display currency icons from your server)

It only responds to slash commands, won't post anything on its own, and doesn't read message content.

## Testing

I've been testing it on a separate server. Everything's working smoothly - responses are usually instant when data is cached, or take a few seconds when refreshing from poe.ninja.

Let me know if you want to add it or have any questions about how it works.
