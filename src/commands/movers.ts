import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, ComponentType } from 'discord.js';
import { currencyAnalyzer } from '../services/currency-analyzer';
import { embedBuilder } from '../services/embed-builder';
import { poeNinjaClient } from '../services/poe-ninja-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES, PAGINATION, DISCORD_LIMITS } from '../config/constants';
import { isValidLeague, normalizeLeagueName, sanitizeInput, validatePaginationLimit } from '../utils/validators';
import { Paginator, createPaginationButtons } from '../utils/pagination';
import type { Command } from '../models/command.interface';
import type { MoverData } from '../models/types';

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
        .setAutocomplete(true)
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
    // Reply immediately with loading message
    await interaction.reply({
      embeds: [embedBuilder.createLoadingEmbed('Calculating market movers...')]
    });

    try {
      // Log command invocation
      logger.info(`[movers] Invoked by ${interaction.user.username} (${interaction.user.id}) in guild ${interaction.guild?.id || 'DM'}`);

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

      // Fetch Exalted Orb price for smart formatting
      let exaltedPrice: number | undefined;
      try {
        const exaltedData = await poeNinjaClient.getCurrency(league, 'Exalted Orb');
        exaltedPrice = exaltedData?.chaosEquivalent;
      } catch (error) {
        logger.warn('Failed to fetch Exalted Orb price for smart formatting:', error);
        // Continue without exalted price - will fall back to chaos formatting
      }

      // Calculate movers
      const { gainers, losers } = await currencyAnalyzer.calculateMovers(league, limit);

      // Filter based on type
      let allMovers: MoverData[] = [];
      if (type === 'all') {
        allMovers = [...gainers, ...losers];
      } else if (type === 'gainers') {
        allMovers = gainers;
      } else {
        allMovers = losers;
      }

      // If no movers, show message and return
      if (allMovers.length === 0) {
        await interaction.editReply({
          embeds: [embedBuilder.createErrorEmbed('No Data', 'No movers found for this league.')]
        });
        return;
      }

      // Setup pagination
      const paginator = new Paginator(allMovers, PAGINATION.MOVERS_PER_PAGE);

      // Helper function to get current page data
      const getCurrentPageData = () => {
        const pageMovers = paginator.getCurrentPageItems();

        // Split into gainers and losers for display
        let pageGainers: MoverData[] = [];
        let pageLosers: MoverData[] = [];

        if (type === 'all') {
          pageGainers = pageMovers.filter(m => m.changePercent > 0);
          pageLosers = pageMovers.filter(m => m.changePercent < 0);
        } else if (type === 'gainers') {
          pageGainers = pageMovers;
        } else {
          pageLosers = pageMovers;
        }

        return { pageGainers, pageLosers };
      };

      // Helper function to update the message
      const updateMessage = async () => {
        const { pageGainers, pageLosers } = getCurrentPageData();
        const startIndex = paginator.currentPage * PAGINATION.MOVERS_PER_PAGE;
        const embed = embedBuilder.createMoversEmbed(
          pageGainers,
          pageLosers,
          league,
          paginator.getPageIndicator(),
          startIndex,
          exaltedPrice
        );

        // Only show buttons if there's more than 1 page
        if (paginator.totalPages > 1) {
          const buttons = createPaginationButtons(paginator, 'movers');
          await interaction.editReply({
            embeds: [embed],
            components: [buttons]
          });
        } else {
          await interaction.editReply({
            embeds: [embed],
            components: []
          });
        }
      };

      // Show first page
      await updateMessage();

      // If only one page, we're done
      if (paginator.totalPages <= 1) {
        return;
      }

      // Create button collector
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: DISCORD_LIMITS.INTERACTION_TIMEOUT
      });

      if (!collector) {
        logger.warn('Could not create button collector for movers command');
        return;
      }

      collector.on('collect', async (buttonInteraction) => {
        // Only respond to the user who initiated the command
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: 'These buttons are not for you!',
            ephemeral: true
          });
          return;
        }

        // Handle button clicks
        const customId = buttonInteraction.customId;
        if (customId.startsWith('movers_')) {
          const action = customId.split('_')[1];

          switch (action) {
            case 'first':
              paginator.firstPage();
              break;
            case 'prev':
              paginator.previousPage();
              break;
            case 'next':
              paginator.nextPage();
              break;
            case 'last':
              paginator.lastPage();
              break;
          }

          // Update the message
          await buttonInteraction.deferUpdate();
          await updateMessage();
        }
      });

      collector.on('end', async () => {
        // Disable all buttons when collector ends
        try {
          const { pageGainers, pageLosers } = getCurrentPageData();
          const startIndex = paginator.currentPage * PAGINATION.MOVERS_PER_PAGE;
          const embed = embedBuilder.createMoversEmbed(
            pageGainers,
            pageLosers,
            league,
            `${paginator.getPageIndicator()} • Buttons expired`,
            startIndex,
            exaltedPrice
          );

          await interaction.editReply({
            embeds: [embed],
            components: []
          });
        } catch (error) {
          logger.error('Error disabling buttons:', error);
        }
      });

    } catch (error) {
      logger.error('Error in movers command:', error);
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

  cooldown: COMMAND_COOLDOWNS.movers
};

export default command;
