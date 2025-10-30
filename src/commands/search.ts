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
    .setName('search')
    .setDescription('Search for currencies by name')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Search term (partial match)')
        .setRequired(true)
    )
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
      embeds: [embedBuilder.createLoadingEmbed('Searching currencies...')]
    });

    try {
      // Log command invocation
      logger.info(`[search] Invoked by ${interaction.user.username} (${interaction.user.id}) in guild ${interaction.guild?.id || 'DM'}`);

      const query = sanitizeInput(interaction.options.getString('query', true));
      let league = sanitizeInput(interaction.options.getString('league') || config.bot.defaultLeague);

      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Search currencies
      const results = await currencyAnalyzer.searchCurrencies(league, query);

      const embed = embedBuilder.createSearchEmbed(results, query, league);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in search command:', error);
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

  cooldown: COMMAND_COOLDOWNS.search
};

export default command;
