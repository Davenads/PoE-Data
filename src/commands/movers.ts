import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { currencyAnalyzer } from '../services/currency-analyzer';
import { embedBuilder } from '../services/embed-builder';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES, PAGINATION } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput, validatePaginationLimit } from '../utils/validators';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('movers')
    .setDescription('Show biggest price movers (gainers/losers)')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of movers to show')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Gainers', value: 'gainers' },
          { name: 'Losers', value: 'losers' }
        )
    )
    .addStringOption(option =>
      option
        .setName('league')
        .setDescription('League name')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of results (1-20)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const type = interaction.options.getString('type') || 'all';
      let league = sanitizeInput(interaction.options.getString('league') || config.bot.defaultLeague);
      const limit = validatePaginationLimit(interaction.options.getInteger('limit') || PAGINATION.DEFAULT_MOVERS);

      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Calculate movers
      const { gainers, losers } = await currencyAnalyzer.calculateMovers(league, limit);

      // Filter based on type
      const displayGainers = type === 'all' || type === 'gainers' ? gainers : [];
      const displayLosers = type === 'all' || type === 'losers' ? losers : [];

      const embed = embedBuilder.createMoversEmbed(displayGainers, displayLosers, league);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in movers command:', error);
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed('Error', ERROR_MESSAGES.UNKNOWN_ERROR)]
      });
    }
  },

  cooldown: COMMAND_COOLDOWNS.movers
};

export default command;
