import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { embedBuilder } from '../services/embed-builder';
import { COMMAND_COOLDOWNS } from '../config/constants';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information and available commands'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const embed = embedBuilder.createHelpEmbed();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // If reply fails, log but don't throw (interaction might have expired)
      console.error('Help command reply failed:', error);
      throw error; // Re-throw to be caught by handler
    }
  },

  cooldown: COMMAND_COOLDOWNS.help
};

export default command;
