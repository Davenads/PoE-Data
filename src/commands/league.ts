import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { embedBuilder } from '../services/embed-builder';
import { redisStore } from '../services/redis-store';
import { poeNinjaClient } from '../services/poe-ninja-client';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS, ERROR_MESSAGES } from '../config/constants';
import { isValidLeague } from '../utils/validators';
import type { Command } from '../models/command.interface';
import type { LeagueInfo } from '../models/types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('league')
    .setDescription('View available leagues and server preferences')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Show available leagues')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set default league for this server')
        .addStringOption(option =>
          option
            .setName('league')
            .setDescription('League name')
            .setRequired(true)
            .addChoices(
              { name: 'Dawn', value: 'Dawn' },
              { name: 'Standard', value: 'Standard' },
              { name: 'Rise of the Abyssal', value: 'Rise of the Abyssal' },
              { name: 'Abyss', value: 'abyss' }
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'list') {
        await handleList(interaction);
      } else if (subcommand === 'set') {
        await handleSet(interaction);
      }

    } catch (error) {
      logger.error('Error in league command:', error);
      await interaction.editReply({
        embeds: [embedBuilder.createErrorEmbed('Error', ERROR_MESSAGES.UNKNOWN_ERROR)]
      });
    }
  },

  cooldown: COMMAND_COOLDOWNS.league
};

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  // Create league info
  const leagues: LeagueInfo[] = [
    { name: 'Dawn', displayName: 'Dawn', isActive: true, currencyCount: 0 },
    { name: 'Standard', displayName: 'Standard', isActive: true, currencyCount: 0 },
    { name: 'Rise of the Abyssal', displayName: 'Rise of the Abyssal', isActive: false, currencyCount: 0 },
    { name: 'abyss', displayName: 'Abyss', isActive: false, currencyCount: 0 }
  ];

  // Get currency counts
  for (const league of leagues) {
    try {
      const names = await poeNinjaClient.getCurrencyNames(league.name);
      league.currencyCount = names.length;
    } catch (error) {
      logger.warn(`Failed to get currency count for ${league.name}`);
    }
  }

  const embed = embedBuilder.createLeagueInfoEmbed(leagues);
  await interaction.editReply({ embeds: [embed] });
}

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.editReply({
      embeds: [embedBuilder.createErrorEmbed('Error', 'This command can only be used in a server.')]
    });
    return;
  }

  const league = interaction.options.getString('league', true);

  if (!isValidLeague(league)) {
    await interaction.editReply({
      embeds: [embedBuilder.createErrorEmbed('Invalid League', ERROR_MESSAGES.LEAGUE_NOT_FOUND)]
    });
    return;
  }

  // Store server preference
  await redisStore.storeServerPreferences(interaction.guildId, { defaultLeague: league });

  const embed = embedBuilder.createSuccessEmbed(
    'League Set',
    `Default league for this server has been set to **${league}**`
  );

  await interaction.editReply({ embeds: [embed] });
}

export default command;
