import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { poeNinjaClient } from '../services/poe-ninja-client';
import { embedBuilder } from '../services/embed-builder';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES, POE2_CURRENCIES } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput } from '../utils/validators';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare prices and ratios between two currencies')
    .addStringOption(option =>
      option
        .setName('currency1')
        .setDescription('First currency')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('currency2')
        .setDescription('Second currency')
        .setRequired(true)
        .setAutocomplete(true)
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
      embeds: [embedBuilder.createLoadingEmbed('Comparing currency prices...')]
    });

    try {
      let currency1 = sanitizeInput(interaction.options.getString('currency1', true));
      let currency2 = sanitizeInput(interaction.options.getString('currency2', true));
      let league = sanitizeInput(interaction.options.getString('league') || config.bot.defaultLeague);

      if (!isValidLeague(league)) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
        });
        return;
      }

      league = normalizeLeagueName(league);

      // Fetch both currencies
      const [data1, data2] = await Promise.all([
        poeNinjaClient.getCurrency(league, currency1),
        poeNinjaClient.getCurrency(league, currency2)
      ]);

      if (!data1 || !data2) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('Currency Not Found', 'One or both currencies not found.')]
        });
        return;
      }

      // Debug logging for exchange rate calculation
      logger.info(`[Compare] ${data1.currencyTypeName}: ${data1.chaosEquivalent}c vs ${data2.currencyTypeName}: ${data2.chaosEquivalent}c`);
      const ratio = data1.chaosEquivalent / data2.chaosEquivalent;
      logger.info(`[Compare] Exchange rate: 1 ${data1.currencyTypeName} = ${ratio.toFixed(2)} ${data2.currencyTypeName}`);

      const embed = embedBuilder.createComparisonEmbed(data1, data2, league);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in compare command:', error);
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed('Error', ERROR_MESSAGES.UNKNOWN_ERROR)]
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'currency1' || focusedOption.name === 'currency2') {
        const query = focusedOption.value.toLowerCase();

        // Use hardcoded currency list for fast autocomplete (no API call needed)
        const filtered = POE2_CURRENCIES
          .filter(name => name.toLowerCase().includes(query))
          .slice(0, 25);

        await interaction.respond(filtered.map(name => ({ name, value: name })));
      }

      if (focusedOption.name === 'league') {
        const query = focusedOption.value.toLowerCase();
        const leagues = ['Dawn', 'Standard', 'Rise of the Abyssal', 'abyss'];
        const filtered = leagues.filter(l => l.toLowerCase().includes(query)).slice(0, 25);
        await interaction.respond(filtered.map(l => ({ name: l, value: l })));
      }
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },

  cooldown: COMMAND_COOLDOWNS.compare
};

export default command;
