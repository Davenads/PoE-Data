import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { embedBuilder } from '../services/embed-builder';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput, isValidTimeframe } from '../utils/validators';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('chart')
    .setDescription('Generate a price history chart for a currency')
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('Currency name')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('timeframe')
        .setDescription('Timeframe for the chart')
        .setRequired(false)
        .addChoices(
          { name: '1 Hour', value: '1h' },
          { name: '6 Hours', value: '6h' },
          { name: '24 Hours', value: '24h' },
          { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' }
        )
    )
    .addStringOption(option =>
      option
        .setName('league')
        .setDescription('League name')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const currency = sanitizeInput(interaction.options.getString('currency', true));
      const timeframe = interaction.options.getString('timeframe') || '24h';
      let league = sanitizeInput(interaction.options.getString('league') || config.bot.defaultLeague);

      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      if (!isValidTimeframe(timeframe)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid Timeframe', ERROR_MESSAGES.INVALID_TIMEFRAME)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Chart generation requires canvas package (platform-specific)
      // Using external chart service or implementing later
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed(
          'Feature Coming Soon',
          `📊 Chart generation for **${currency}** (${timeframe}) will be implemented in Phase 3.\n\n` +
          `**Currently Available:**\n` +
          `• \`/price ${currency}\` - Current price & 24h change\n` +
          `• \`/movers\` - Biggest price movements\n` +
          `• \`/trends ${league}\` - Market overview\n\n` +
          `Price history data is being collected in the background!`
        )]
      });

    } catch (error) {
      logger.error('Error in chart command:', error);
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed('Error', ERROR_MESSAGES.UNKNOWN_ERROR)]
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'currency') {
        // For now, return empty array - will implement with poeNinjaClient later
        await interaction.respond([]);
      }
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },

  cooldown: COMMAND_COOLDOWNS.chart
};

export default command;
