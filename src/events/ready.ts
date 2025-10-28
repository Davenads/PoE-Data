import { Client } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Handle bot ready event
 */
export async function handleReady(client: Client<true>): Promise<void> {
  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
  logger.info(`Connected to ${client.guilds.cache.size} guild(s)`);

  // Set bot presence/status
  client.user.setPresence({
    activities: [
      {
        name: 'PoE2 Economy | /help',
        type: 3 // Watching
      }
    ],
    status: 'online'
  });

  // Log environment info
  logger.info(`Environment: ${config.environment}`);
  logger.info(`Default league: ${config.bot.defaultLeague}`);
  logger.info(`Autocomplete enabled: ${config.bot.enableAutocomplete}`);

  // Warm cache (optional - can be implemented later)
  // await warmCache();
}
