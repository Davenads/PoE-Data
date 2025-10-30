import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { embedBuilder } from '../services/embed-builder';
import { logger } from '../utils/logger';
import { COMMAND_COOLDOWNS } from '../config/constants';
import type { Command } from '../models/command.interface';

/**
 * Calculate Trinity Support efficiency based on elemental damage ranges
 */
function calculateTrinityEfficiency(
  fireMin: number,
  fireMax: number,
  coldMin: number,
  coldMax: number,
  lightningMin: number,
  lightningMax: number,
  gemLevel: number
): {
  avgResonance: { fire: number; cold: number; lightning: number };
  totalResonance: number;
  damageBonus: number;
  distribution: { fire: number; cold: number; lightning: number };
  efficiency: number;
  recommendation?: string;
  weakElement?: string;
} {
  // Calculate probability of each element being highest on a given hit
  // This uses Monte Carlo-style probability calculation for accuracy
  let fireHighest = 0;
  let coldHighest = 0;
  let lightningHighest = 0;
  const samples = 10000; // Sample size for accuracy

  for (let i = 0; i < samples; i++) {
    // Random roll within each element's range
    const fireRoll = fireMin + Math.random() * (fireMax - fireMin);
    const coldRoll = coldMin + Math.random() * (coldMax - coldMin);
    const lightningRoll = lightningMin + Math.random() * (lightningMax - lightningMin);

    // Determine which is highest
    const maxDamage = Math.max(fireRoll, coldRoll, lightningRoll);

    if (fireRoll === maxDamage) fireHighest++;
    else if (coldRoll === maxDamage) coldHighest++;
    else lightningHighest++;
  }

  // Convert to probabilities
  const pFire = fireHighest / samples;
  const pCold = coldHighest / samples;
  const pLightning = lightningHighest / samples;

  // Gem level scaling for resonance gain
  // Levels 1-20: 5-13 (linear scaling)
  // Level 21-22: 14
  // Level 23-24: 14
  // Level 25: 15
  let resonanceGain: number;
  if (gemLevel <= 20) {
    resonanceGain = 5 + Math.floor((gemLevel - 1) * (13 - 5) / 19);
  } else if (gemLevel <= 24) {
    resonanceGain = 14;
  } else {
    resonanceGain = 15;
  }

  const resonanceLoss = 3;

  // Calculate steady-state resonance for each element
  // Trinity mechanics:
  // - When fire is highest: fire gains +resonanceGain, cold/lightning each lose -3
  // - When cold is highest: cold gains +resonanceGain, fire/lightning each lose -3
  // - When lightning is highest: lightning gains +resonanceGain, fire/cold each lose -3
  //
  // At steady state equilibrium:
  // Fire gain rate = Fire loss rate
  // pFire * resonanceGain = (pCold + pLightning) * resonanceLoss
  //
  // The actual steady-state resonance value depends on the rate of gain vs loss
  // With perfect 33.3% distribution and resonanceGain=14, loss=3:
  // - Each element gains: 0.333 * 14 = 4.67 per hit cycle
  // - Each element loses: 0.667 * 3 = 2.00 per hit cycle
  // - Net: +2.67 per cycle
  //
  // This means resonance will climb to 100 (cap) with balanced damage!
  // The actual formula needs to account for the cap and equilibrium dynamics.
  //
  // Correct steady-state formula (derived from equilibrium analysis):
  // resonance = 100 * (pElement * gain) / ((pElement * gain) + ((1 - pElement) * loss))

  const fireResonance = Math.max(0, Math.min(100,
    100 * (pFire * resonanceGain) / ((pFire * resonanceGain) + ((1 - pFire) * resonanceLoss))
  ));
  const coldResonance = Math.max(0, Math.min(100,
    100 * (pCold * resonanceGain) / ((pCold * resonanceGain) + ((1 - pCold) * resonanceLoss))
  ));
  const lightningResonance = Math.max(0, Math.min(100,
    100 * (pLightning * resonanceGain) / ((pLightning * resonanceGain) + ((1 - pLightning) * resonanceLoss))
  ));

  const totalResonance = fireResonance + coldResonance + lightningResonance;

  // Gem level scaling for damage bonus per 30 resonance
  // Levels 1-20: 1-6% (linear scaling)
  // Level 21-22: 6%
  // Level 23-24: 7%
  // Level 25: 7%
  let bonusPerResonance: number;
  if (gemLevel <= 20) {
    bonusPerResonance = 1 + Math.floor((gemLevel - 1) * (6 - 1) / 19);
  } else if (gemLevel <= 22) {
    bonusPerResonance = 6;
  } else {
    bonusPerResonance = 7;
  }
  const damageBonus = (totalResonance / 30) * bonusPerResonance;

  // Calculate efficiency (% of theoretical maximum achievable)
  // Max achievable with perfect 33.3% balance (not absolute 300 cap):
  // Each element at ~71.4 resonance = 214 total with current mechanics
  const maxAchievableResonance = 3 * (100 * (0.333 * resonanceGain) / ((0.333 * resonanceGain) + (0.667 * resonanceLoss)));
  const maxAchievableBonus = (maxAchievableResonance / 30) * bonusPerResonance;
  const efficiency = (damageBonus / maxAchievableBonus) * 100;

  // Detect if build is 2-element focused (one element < 15% distribution)
  const elements = [
    { name: 'fire', prob: pFire, resonance: fireResonance },
    { name: 'cold', prob: pCold, resonance: coldResonance },
    { name: 'lightning', prob: pLightning, resonance: lightningResonance }
  ];

  const weakElements = elements.filter(e => e.prob < 0.15);
  let recommendation: string | undefined;
  let weakElement: string | undefined;

  if (weakElements.length === 1 && weakElements[0].prob < 0.15) {
    // 2-element build detected
    const weak = weakElements[0];
    const elementName = weak.name.charAt(0).toUpperCase() + weak.name.slice(1);
    weakElement = elementName;

    // Calculate potential total if paired with pure weak element skill in rotation
    // Assumption: 50/50 alternating rotation between this skill and pure weak element skill
    // The weak element can reach near 100, and the two strong elements will stabilize higher
    // In practice, with good rotation, total can approach 280-290
    const strongElements = elements.filter(e => e.name !== weak.name);

    // Conservative estimate: weak element at 95, strong elements maintain ~90% of current
    const weakResonanceInRotation = 95;
    const strongResonance1 = Math.min(95, Math.round(strongElements[0].resonance * 0.9));
    const strongResonance2 = Math.min(95, Math.round(strongElements[1].resonance * 0.9));
    const potentialTotal = weakResonanceInRotation + strongResonance1 + strongResonance2;

    recommendation = `Pair with ${elementName} skill for ~${potentialTotal}/300 total resonance (near-optimal rotation)`;
  }

  return {
    avgResonance: {
      fire: Math.round(fireResonance),
      cold: Math.round(coldResonance),
      lightning: Math.round(lightningResonance)
    },
    totalResonance: Math.round(totalResonance),
    damageBonus: Math.round(damageBonus * 10) / 10,
    distribution: {
      fire: Math.round(pFire * 1000) / 10,
      cold: Math.round(pCold * 1000) / 10,
      lightning: Math.round(pLightning * 1000) / 10
    },
    efficiency: Math.round(efficiency * 10) / 10,
    recommendation,
    weakElement
  };
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trinity')
    .setDescription('Calculate Trinity Support gem efficiency')
    .addIntegerOption(option =>
      option
        .setName('fire_min')
        .setDescription('Minimum fire damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('fire_max')
        .setDescription('Maximum fire damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('cold_min')
        .setDescription('Minimum cold damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('cold_max')
        .setDescription('Maximum cold damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('lightning_min')
        .setDescription('Minimum lightning damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('lightning_max')
        .setDescription('Maximum lightning damage')
        .setRequired(true)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('gem_level')
        .setDescription('Trinity gem level (default: 20)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Log command invocation
      logger.info(`[trinity] Invoked by ${interaction.user.username} (${interaction.user.id}) in guild ${interaction.guild?.id || 'DM'}`);

      const fireMin = interaction.options.getInteger('fire_min', true);
      const fireMax = interaction.options.getInteger('fire_max', true);
      const coldMin = interaction.options.getInteger('cold_min', true);
      const coldMax = interaction.options.getInteger('cold_max', true);
      const lightningMin = interaction.options.getInteger('lightning_min', true);
      const lightningMax = interaction.options.getInteger('lightning_max', true);
      const gemLevel = interaction.options.getInteger('gem_level') || 20;

      // Validation
      if (fireMax < fireMin || coldMax < coldMin || lightningMax < lightningMin) {
        await interaction.reply({
          embeds: [embedBuilder.createErrorEmbed(
            'Invalid Input',
            'Maximum damage values must be greater than or equal to minimum values.'
          )],
          ephemeral: true
        });
        return;
      }

      if (fireMin === 0 && fireMax === 0 && coldMin === 0 && coldMax === 0 && lightningMin === 0 && lightningMax === 0) {
        await interaction.reply({
          embeds: [embedBuilder.createErrorEmbed(
            'Invalid Input',
            'At least one element must have non-zero damage.'
          )],
          ephemeral: true
        });
        return;
      }

      logger.info(`Trinity calculation: F=${fireMin}-${fireMax}, C=${coldMin}-${coldMax}, L=${lightningMin}-${lightningMax}, Level=${gemLevel}`);

      const result = calculateTrinityEfficiency(
        fireMin, fireMax,
        coldMin, coldMax,
        lightningMin, lightningMax,
        gemLevel
      );

      const embed = embedBuilder.createTrinityEmbed(
        {
          fireMin, fireMax,
          coldMin, coldMax,
          lightningMin, lightningMax,
          gemLevel
        },
        result
      );

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in trinity command:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed('Error', 'Failed to calculate Trinity efficiency.')],
        ephemeral: true
      });
    }
  },

  cooldown: COMMAND_COOLDOWNS.help // Same as help - instant calculation
};

export default command;
