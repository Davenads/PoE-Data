import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { client } from '../bot';
import { logger } from '../utils/logger';
import type { Command } from '../models/command.interface';

/**
 * Dynamically load all command files from the commands directory
 */
async function discoverCommands(): Promise<Command[]> {
  const commands: Command[] = [];
  const commandsPath = __dirname; // Current directory (commands folder)

  try {
    const commandFiles = readdirSync(commandsPath).filter(file => {
      // Load .ts files in development or .js files in production
      // Skip index.ts/index.js to avoid circular imports
      // Skip .d.ts declaration files (produced by TypeScript compilation)
      return (file.endsWith('.ts') || file.endsWith('.js')) &&
             !file.endsWith('.d.ts') &&
             file !== 'index.ts' &&
             file !== 'index.js';
    });

    logger.debug(`Found ${commandFiles.length} command files`);

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);

      try {
        // Dynamic import (works with both TS and JS)
        const commandModule = await import(filePath);
        const command = commandModule.default;

        if (command && command.data && command.execute) {
          commands.push(command);
          logger.debug(`Discovered command: ${file} (/${command.data.name})`);
        } else {
          logger.warn(`Skipped invalid command file: ${file} (missing data or execute)`);
        }
      } catch (error) {
        logger.error(`Failed to load command file: ${file}`, error);
      }
    }

    return commands;
  } catch (error) {
    logger.error('Error discovering commands:', error);
    throw error;
  }
}

/**
 * Load all commands into the client
 */
export async function loadCommands(): Promise<void> {
  // Dynamically discover and load all commands
  const commands = await discoverCommands();

  if (commands.length === 0) {
    logger.warn('No valid commands found to load');
    return;
  }

  client.commands = new Collection<string, Command>();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
    logger.debug(`Registered command: /${command.data.name}`);
  }

  logger.info(`Successfully loaded ${client.commands.size} commands`);
}
