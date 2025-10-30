import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { scheduledTasks } from '../services/scheduled-tasks';
import { embedBuilder } from '../services/embed-builder';
import { logger } from '../utils/logger';
import { formatRelativeTime } from '../utils/formatters';
import type { Command } from '../models/command.interface';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View bot system status and scheduled task information'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      logger.info(`[status] Invoked by ${interaction.user.username} (${interaction.user.id})`);

      const taskStatus = scheduledTasks.getStatus();

      // Build status message
      let statusMessage = '**Scheduled Tasks:**\n';
      statusMessage += `Running: ${taskStatus.isRunning ? '✅ Yes' : '❌ No'}\n\n`;

      if (taskStatus.lastRunTime) {
        statusMessage += `**Last Run:**\n`;
        statusMessage += `Time: ${taskStatus.lastRunTime.toISOString()}\n`;
        statusMessage += `Status: ${taskStatus.lastRunStatus === 'success' ? '✅ Success' : '❌ Failed'}\n`;

        if (taskStatus.lastRunStats) {
          statusMessage += `Currencies Fetched: ${taskStatus.lastRunStats.currencies}\n`;
          statusMessage += `Duration: ${(taskStatus.lastRunStats.duration / 1000).toFixed(2)}s\n`;
        }
      } else {
        statusMessage += `**Last Run:** No runs yet\n`;
      }

      statusMessage += `\n**Bot Uptime:**\n${formatRelativeTime(new Date(Date.now() - (process.uptime() * 1000)).toISOString())}`;

      const embed = embedBuilder.createSuccessEmbed('Bot Status', statusMessage);

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      logger.error('Error in status command:', error);

      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed(
          'Error',
          'Failed to retrieve status information.'
        )],
        ephemeral: true
      });
    }
  },

  cooldown: 5
};

export default command;
