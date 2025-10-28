import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import { client } from '../bot';
import { logger } from '../utils/logger';
import { embedBuilder } from '../services/embed-builder';

// Cooldown tracking
const cooldowns = new Map<string, Map<string, number>>();

/**
 * Handle interaction events (slash commands, autocomplete, etc.)
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  }

  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  }
}

/**
 * Handle slash command execution
 */
async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command ${interaction.commandName} not found`);
    return;
  }

  try {
    // Check cooldown
    if (command.cooldown) {
      const cooldownPassed = checkCooldown(
        interaction.user.id,
        interaction.commandName,
        command.cooldown
      );

      if (!cooldownPassed) {
        const timeLeft = getCooldownTimeLeft(
          interaction.user.id,
          interaction.commandName,
          command.cooldown
        );

        await interaction.reply({
          embeds: [embedBuilder.createErrorEmbed(
            'Cooldown Active',
            `Please wait ${timeLeft.toFixed(1)}s before using this command again.`
          )],
          ephemeral: true
        });
        return;
      }
    }

    // Log command usage
    logger.info(
      `Command ${interaction.commandName} executed by ${interaction.user.tag} ` +
      `in ${interaction.guild?.name || 'DM'}`
    );

    // Execute command
    await command.execute(interaction);

  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);

    const errorEmbed = embedBuilder.createErrorEmbed(
      'Command Error',
      error instanceof Error ? error.message : 'An unknown error occurred'
    );

    // Send error response
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

/**
 * Handle autocomplete interactions
 */
async function handleAutocomplete(interaction: any): Promise<void> {
  const command = client.commands.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Error in autocomplete for ${interaction.commandName}:`, error);
  }
}

/**
 * Check if user is on cooldown for a command
 */
function checkCooldown(userId: string, commandName: string, cooldownSeconds: number): boolean {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();
  const cooldownAmount = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;

    if (now < expirationTime) {
      return false; // Still on cooldown
    }
  }

  // Set new cooldown
  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return true; // Cooldown passed
}

/**
 * Get time left on cooldown (in seconds)
 */
function getCooldownTimeLeft(userId: string, commandName: string, cooldownSeconds: number): number {
  const timestamps = cooldowns.get(commandName);
  if (!timestamps || !timestamps.has(userId)) {
    return 0;
  }

  const now = Date.now();
  const expirationTime = timestamps.get(userId)! + (cooldownSeconds * 1000);
  const timeLeft = (expirationTime - now) / 1000;

  return Math.max(timeLeft, 0);
}
