import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { embedBuilder } from '../services/embed-builder';
import { COMMAND_COOLDOWNS } from '../config/constants';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information and available commands'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = embedBuilder.createHelpEmbed();
    await interaction.reply({ embeds: [embed] });
  },

  cooldown: COMMAND_COOLDOWNS.help
};

export default command;
