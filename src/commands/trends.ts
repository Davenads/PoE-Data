import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { currencyAnalyzer } from '../services/currency-analyzer';
import { embedBuilder } from '../services/embed-builder';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput } from '../utils/validators';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trends')
    .setDescription('View market overview and trends')
    .addStringOption(option =>
      option
        .setName('league')
        .setDescription('League name')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      let league = sanitizeInput(interaction.options.getString('league') || config.bot.defaultLeague);

      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Generate market trends
      const trends = await currencyAnalyzer.generateMarketTrends(league);

      const embed = embedBuilder.createTrendsEmbed(trends);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in trends command:', error);
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed('Error', ERROR_MESSAGES.UNKNOWN_ERROR)]
      });
    }
  },

  cooldown: COMMAND_COOLDOWNS.trends
};

export default command;
