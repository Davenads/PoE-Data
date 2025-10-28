import {
  SlashCommandBuilder,
  CommandInteraction,
  AutocompleteInteraction,
  ChatInputCommandInteraction
} from 'discord.js';

/**
 * Command interface for slash commands
 */
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number; // Cooldown in seconds
}

/**
 * Extend Discord.js Client to include commands collection
 */
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}
