import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { poeNinjaClient } from '../services/poe-ninja-client';
import { embedBuilder } from '../services/embed-builder';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES, POE2_CURRENCIES } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput } from '../utils/validators';
import { getMultiTimeframeChanges } from '../utils/price-history-calculator';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get the current price of a specific currency')
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('Currency name (e.g., Divine Orb)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('league')
        .setDescription('League name (defaults to server default or Dawn)')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Reply immediately with loading message
    await interaction.reply({
      embeds: [embedBuilder.createLoadingEmbed('Fetching price data...')]
    });

    try {
      // Log command invocation
      logger.info(`[price] Invoked by ${interaction.user.username} (${interaction.user.id}) in guild ${interaction.guild?.id || 'DM'}`);

      // Get parameters
      let currency = interaction.options.getString('currency', true);
      let league = interaction.options.getString('league') || config.bot.defaultLeague;

      // Sanitize inputs
      currency = sanitizeInput(currency);
      league = sanitizeInput(league);

      // Validate league
      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Fetch currency data
      logger.info(`[price] Fetching ${currency} in ${league}`);
      const currencyData = await poeNinjaClient.getCurrency(league, currency);

      if (!currencyData) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Currency Not Found', ERROR_MESSAGES.CURRENCY_NOT_FOUND)]
        });
        return;
      }

      // Calculate 12h and 24h price changes from Redis history
      logger.info(`[price] Calculating timeframe changes for ${currency}`);
      const { change12h, change24h } = await getMultiTimeframeChanges(
        league,
        currency,
        currencyData.chaosEquivalent
      );

      if (change12h === null && change24h === null) {
        logger.info(`[price] No historical data available for ${currency} - showing 7d change only`);
      }

      // Create and send embed
      const embed = embedBuilder.createPriceEmbed(currencyData, league, change12h, change24h);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in price command:', error);

      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed(
          'Error',
          error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR
        )]
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'currency') {
        const query = focusedOption.value.toLowerCase();

        // Use hardcoded currency list for fast autocomplete (no API call needed)
        const filtered = POE2_CURRENCIES
          .filter(name => name.toLowerCase().includes(query))
          .slice(0, 25); // Discord limit

        await interaction.respond(
          filtered.map(name => ({ name, value: name }))
        );
      }

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

  cooldown: COMMAND_COOLDOWNS.price
};

export default command;
