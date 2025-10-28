import { Collection } from 'discord.js';
import { client } from '../bot';
import { logger } from '../utils/logger';
import type { Command } from '../models/command.interface';

// Import commands
import priceCommand from './price';
import helpCommand from './help';
import compareCommand from './compare';
import moversCommand from './movers';
import searchCommand from './search';
import leagueCommand from './league';
import trendsCommand from './trends';
import chartCommand from './chart';

/**
 * Load all commands into the client
 */
export async function loadCommands(): Promise<void> {
  const commands: Command[] = [
    priceCommand,
    helpCommand,
    compareCommand,
    moversCommand,
    searchCommand,
    leagueCommand,
    trendsCommand,
    chartCommand
  ];

  client.commands = new Collection<string, Command>();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
    logger.debug(`Loaded command: ${command.data.name}`);
  }

  logger.info(`Successfully loaded ${client.commands.size} commands`);
}

export { priceCommand, helpCommand };
