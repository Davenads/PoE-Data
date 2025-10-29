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
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Reply immediately with loading message
    await interaction.reply({
      embeds: [embedBuilder.createLoadingEmbed('Searching currencies...')]
    });

    try {
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

  cooldown: COMMAND_COOLDOWNS.search
};

export default command;
