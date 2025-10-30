import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
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
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Reply immediately with loading message
    await interaction.reply({
      embeds: [embedBuilder.createLoadingEmbed('Analyzing market trends...')]
    });

    try {
      // Log command invocation
      logger.info(`[trends] Invoked by ${interaction.user.username} (${interaction.user.id}) in guild ${interaction.guild?.id || 'DM'}`);

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

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'league') {
        const query = focusedOption.value.toLowerCase();
        const leagues = ['Dawn', 'Standard', 'Rise of the Abyssal', 'abyss'];

        const filtered = leagues
          .filter(league => league.toLowerCase().includes(query))
          .slice(0, 25);

        await interaction.respond(
          filtered.map(league => ({ name: league, value: league }))
        );
      }
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },

  cooldown: COMMAND_COOLDOWNS.trends
};

export default command;
