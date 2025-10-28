import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { logger } from './utils/logger';
import type { Command } from './models/command.interface';

// Create Discord client with necessary intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Create command collection
client.commands = new Collection<string, Command>();

// Global error handlers
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Discord client error handler
client.on(Events.Error, (error: Error) => {
  logger.error('Discord client error:', error);
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    client.destroy();
    logger.info('Discord client destroyed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export client for use in other modules
export default client;
