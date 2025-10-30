import { Events } from 'discord.js';
import { client } from './bot';
import { config } from './config/config';
import { logger } from './utils/logger';
import { loadCommands } from './commands';
import { handleInteraction } from './events/interactionCreate';
import { handleReady } from './events/ready';
import { redisStore } from './services/redis-store';
import { scheduledTasks } from './services/scheduled-tasks';

async function start() {
  try {
    logger.info('Starting PoE2 Discord Bot...');

    // Initialize Redis connection
    await redisStore.connect();
    logger.info('✓ Redis connection established');

    // Load commands
    await loadCommands();
    logger.info(`✓ Loaded ${client.commands.size} commands`);

    // Start scheduled tasks (hourly price fetching)
    scheduledTasks.start();
    logger.info('✓ Scheduled tasks initialized');

    // Register event handlers
    client.once(Events.ClientReady, handleReady);
    client.on(Events.InteractionCreate, handleInteraction);

    // Login to Discord
    await client.login(config.discord.token);

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the bot
start();
