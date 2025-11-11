import { EmbedBuilder } from 'discord.js';
import { EMBED_COLORS } from '../config/constants';
import {
  formatChaosPrice,
  formatPercentChange,
  formatNumber,
  formatRelativeTime,
  getPriceChangeEmoji,
  getSentimentEmoji,
  formatPrice,
  formatMoversPrice
} from '../utils/formatters';
import { formatCurrencyWithEmoji } from '../utils/emoji-helper';
import type {
  CurrencyData,
  MoverData,
  MarketTrends,
  LeagueInfo
} from '../models/types';

/**
 * Service for building Discord embeds
 */
export class EmbedBuilderService {
  /**
   * Create embed for currency price
   */
  createPriceEmbed(
    currency: CurrencyData,
    league: string,
    change12h?: number | null,
    change24h?: number | null
  ): EmbedBuilder {
    const change7d = currency.paySparkLine.totalChange;
    const change7dEmoji = getPriceChangeEmoji(change7d);

    // Use 24h change for color if available, otherwise use 7d
    const primaryChange = change24h !== null && change24h !== undefined ? change24h : change7d;
    const color = primaryChange > 0 ? EMBED_COLORS.BULLISH : primaryChange < 0 ? EMBED_COLORS.BEARISH : EMBED_COLORS.NEUTRAL;

    // Format currency name with emoji (no trend emoji in title)
    const currencyWithEmoji = formatCurrencyWithEmoji(currency.currencyTypeName);

    const embed = new EmbedBuilder()
      .setTitle(`${currencyWithEmoji}`)
      .setDescription(`**${league}** League`)
      .setColor(color)
      .addFields(
        {
          name: '💰 Current Price',
          value: `${formatChaosPrice(currency.chaosEquivalent)}`,
          inline: true
        },
        {
          name: '📈 12h Change',
          value: change12h !== null && change12h !== undefined
            ? `${formatPercentChange(change12h)} ${getPriceChangeEmoji(change12h)}`
            : 'N/A',
          inline: true
        },
        {
          name: '📊 24h Change',
          value: change24h !== null && change24h !== undefined
            ? `${formatPercentChange(change24h)} ${getPriceChangeEmoji(change24h)}`
            : 'N/A',
          inline: true
        },
        {
          name: '📅 7d Change',
          value: `${formatPercentChange(change7d)} ${change7dEmoji}`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: `Updated ${formatRelativeTime(currency.pay.sample_time_utc)}` });

    return embed;
  }

  /**
   * Create embed for currency comparison
   */
  createComparisonEmbed(
    currency1: CurrencyData,
    currency2: CurrencyData,
    league: string
  ): EmbedBuilder {
    const ratio1to2 = currency1.chaosEquivalent / currency2.chaosEquivalent;
    const ratio2to1 = currency2.chaosEquivalent / currency1.chaosEquivalent;

    const betterPerformer = currency1.paySparkLine.totalChange > currency2.paySparkLine.totalChange
      ? currency1.currencyTypeName
      : currency2.currencyTypeName;

    // Format currency names with emojis
    const currency1WithEmoji = formatCurrencyWithEmoji(currency1.currencyTypeName);
    const currency2WithEmoji = formatCurrencyWithEmoji(currency2.currencyTypeName);
    const betterPerformerWithEmoji = formatCurrencyWithEmoji(betterPerformer);

    // Helper function to format ratio - use k/m/b notation for large numbers, otherwise fixed decimals
    const formatRatio = (ratio: number): string => {
      if (ratio >= 100) {
        // Use k/m/b notation for ratios >= 100
        return formatPrice(ratio, 2);
      } else if (ratio >= 1) {
        // Use 2 decimals for ratios >= 1
        return ratio.toFixed(2);
      } else if (ratio >= 0.01) {
        // Use 4 decimals for small ratios
        return ratio.toFixed(4);
      } else {
        // Use scientific notation for very small ratios
        return ratio.toExponential(2);
      }
    };

    // Format exchange rates - show how many of currency2 you get for 1 of currency1
    // The ratio is based on chaos values, so we just show the numeric ratio
    let exchangeRateText: string;
    if (ratio1to2 >= 1) {
      // If ratio is >= 1, show currency1 -> currency2
      exchangeRateText = `1 ${currency1WithEmoji} = **${formatRatio(ratio1to2)}** ${currency2.currencyTypeName}`;
      if (ratio2to1 >= 0.001) {
        exchangeRateText += `\n1 ${currency2WithEmoji} = **${formatRatio(ratio2to1)}** ${currency1.currencyTypeName}`;
      }
    } else {
      // If ratio is < 1, flip it for better readability
      exchangeRateText = `1 ${currency2WithEmoji} = **${formatRatio(ratio2to1)}** ${currency1.currencyTypeName}`;
      if (ratio1to2 >= 0.001) {
        exchangeRateText += `\n1 ${currency1WithEmoji} = **${formatRatio(ratio1to2)}** ${currency2.currencyTypeName}`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚖️ Currency Comparison`)
      .setDescription(`**${league}** League`)
      .setColor(EMBED_COLORS.INFO)
      .addFields(
        {
          name: `${currency1WithEmoji}`,
          value: `${formatChaosPrice(currency1.chaosEquivalent)}\n${formatPercentChange(currency1.paySparkLine.totalChange)}`,
          inline: true
        },
        {
          name: 'vs',
          value: '⚖️',
          inline: true
        },
        {
          name: `${currency2WithEmoji}`,
          value: `${formatChaosPrice(currency2.chaosEquivalent)}\n${formatPercentChange(currency2.paySparkLine.totalChange)}`,
          inline: true
        },
        {
          name: '💱 Exchange Rate',
          value: exchangeRateText,
          inline: false
        },
        {
          name: '📊 Better Performer (24h)',
          value: `**${betterPerformerWithEmoji}**`,
          inline: false
        }
      )
      .setTimestamp();

    return embed;
  }

  /**
   * Create embed for market movers (paginated version)
   */
  createMoversEmbed(
    gainers: MoverData[],
    losers: MoverData[],
    league: string,
    pageIndicator?: string,
    startIndex: number = 0,
    tierFilter?: string
  ): EmbedBuilder {
    // Build title with tier filter if applied
    let title = `Market Movers - ${league}`;
    if (tierFilter && tierFilter !== 'all') {
      const tierNames: { [key: string]: string } = {
        'budget': 'Budget (0.1+ ex)',
        'mid': 'Mid (1+ ex)',
        'premium': 'Premium (10+ ex)',
        'elite': 'Elite (100+ ex)'
      };
      title += ` • ${tierNames[tierFilter] || tierFilter}`;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    // Helper function to format movers using chaos-only formatting
    const formatMovers = (movers: MoverData[], offset: number): string => {
      return movers
        .map((m, i) => {
          const changeEmoji = getPriceChangeEmoji(m.changePercent);
          const currencyWithEmoji = formatCurrencyWithEmoji(m.currencyTypeName);
          return `${offset + i + 1}. **${currencyWithEmoji}**: ${formatPercentChange(m.changePercent)} ${changeEmoji}\n   ${formatMoversPrice(m.previousPrice)} → ${formatMoversPrice(m.currentPrice)}`;
        })
        .join('\n\n');
    };

    if (gainers.length > 0) {
      embed.addFields({
        name: '📈 Top Gainers',
        value: formatMovers(gainers, startIndex),
        inline: false
      });
    }

    if (losers.length > 0) {
      embed.addFields({
        name: '📉 Top Losers',
        value: formatMovers(losers, startIndex + gainers.length),
        inline: false
      });
    }

    // Add page indicator if provided
    if (pageIndicator) {
      embed.setFooter({ text: pageIndicator });
    }

    return embed;
  }

  /**
   * Create embed for search results
   */
  createSearchEmbed(results: CurrencyData[], query: string, league: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Search Results for "${query}"`)
      .setDescription(`**${league}** League - Found ${results.length} currencies`)
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    if (results.length === 0) {
      embed.addFields({
        name: 'No Results',
        value: 'No currencies found matching your search. Try a different term.'
      });
      return embed;
    }

    const resultsText = results
      .slice(0, 10) // Limit to 10 results
      .map((c, i) => {
        const changeEmoji = getPriceChangeEmoji(c.paySparkLine.totalChange);
        const currencyWithEmoji = formatCurrencyWithEmoji(c.currencyTypeName);
        return `${i + 1}. **${currencyWithEmoji}** - ${formatChaosPrice(c.chaosEquivalent)} (${formatPercentChange(c.paySparkLine.totalChange)} ${changeEmoji})`;
      })
      .join('\n');

    embed.addFields({
      name: 'Results',
      value: resultsText + (results.length > 10 ? `\n\n...and ${results.length - 10} more` : ''),
      inline: false
    });

    embed.setFooter({ text: 'Use /price [currency] for detailed information' });

    return embed;
  }

  /**
   * Create embed for league info
   */
  createLeagueInfoEmbed(leagues: LeagueInfo[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🌍 Available PoE2 Leagues')
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    const leaguesText = leagues
      .map(league => {
        const status = league.isActive ? '🔴 Active' : '⚫ Ended';
        return `**${league.displayName}** ${status}\n└─ ${formatNumber(league.currencyCount)} currencies tracked`;
      })
      .join('\n\n');

    embed.setDescription(leaguesText);
    embed.setFooter({ text: 'Use /league set [league] to change default' });

    return embed;
  }

  /**
   * Create embed for market trends
   */
  createTrendsEmbed(trends: MarketTrends): EmbedBuilder {
    const sentimentEmoji = getSentimentEmoji(trends.sentiment);
    const mostActiveCurrencyWithEmoji = formatCurrencyWithEmoji(trends.mostActive.currency);
    const topGainerWithEmoji = formatCurrencyWithEmoji(trends.topMover.gainer.currency);
    const topLoserWithEmoji = formatCurrencyWithEmoji(trends.topMover.loser.currency);
    const mostStableWithEmoji = formatCurrencyWithEmoji(trends.mostStable.currency);
    const divineEmoji = formatCurrencyWithEmoji('Divine Orb');
    const exaltedEmoji = formatCurrencyWithEmoji('Exalted Orb');

    // Format sentiment name
    const sentimentName = trends.sentiment
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Sentiment-based color coding with granularity
    let embedColor: number;
    switch (trends.sentiment) {
      case 'very_bullish':
        embedColor = 0x57F287; // Bright green
        break;
      case 'bullish':
        embedColor = 0x77DD77; // Medium green
        break;
      case 'neutral':
        embedColor = EMBED_COLORS.NEUTRAL; // Gray
        break;
      case 'bearish':
        embedColor = 0xFF9999; // Light red
        break;
      case 'very_bearish':
        embedColor = 0xED4245; // Bright red
        break;
      default:
        embedColor = EMBED_COLORS.NEUTRAL;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Market Trends - ${trends.league}`)
      .setColor(embedColor)
      .setDescription(
        `Market Sentiment: ${sentimentEmoji} **${sentimentName}**\n` +
        `Average 24h Change: **${formatPercentChange(trends.averageChange24h)}**\n` +
        `Market Breadth: **${trends.marketBreadth.gainersPercent.toFixed(0)}% Up** | **${trends.marketBreadth.losersPercent.toFixed(0)}% Down**`
      )
      .addFields(
        {
          name: '─── Key Currencies ───',
          value: `${divineEmoji} **${formatChaosPrice(trends.keyCurrencies.divine)}** | ${exaltedEmoji} **${formatChaosPrice(trends.keyCurrencies.exalted)}**\n` +
                `Ratio: **1 Divine = ${trends.keyCurrencies.divineToExaltedRatio.toFixed(2)} Exalted**`,
          inline: false
        },
        {
          name: '─── Market Leaders ───',
          value: `🔥 **Most Active:** ${mostActiveCurrencyWithEmoji} (${formatNumber(trends.mostActive.volume)} listings)\n` +
                `🔒 **Most Stable:** ${mostStableWithEmoji} (${trends.mostStable.volatility.toFixed(1)}% volatility)`,
          inline: false
        },
        {
          name: '─── Quick Movers ───',
          value: `🔝 **Top Gainer:** ${topGainerWithEmoji} **${formatPercentChange(trends.topMover.gainer.change)}**\n` +
                `📉 **Top Loser:** ${topLoserWithEmoji} **${formatPercentChange(trends.topMover.loser.change)}**`,
          inline: false
        },
        {
          name: '─── Market Health ───',
          value: `💧 **Total Liquidity:** ${formatNumber(trends.totalLiquidity)} listings\n` +
                `⚡ **Volatility Index:** ${trends.volatilityIndex.toFixed(1)}% (Market average)\n` +
                `📈 **Tracking:** ${formatNumber(trends.currenciesTracked)} currencies`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: `Last updated ${formatRelativeTime(trends.lastUpdated)}` });

    return embed;
  }

  /**
   * Create error embed
   */
  createErrorEmbed(title: string, message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`❌ ${title}`)
      .setDescription(message)
      .setColor(EMBED_COLORS.ERROR)
      .setTimestamp();
  }

  /**
   * Create success embed
   */
  createSuccessEmbed(title: string, message: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`✅ ${title}`)
      .setDescription(message)
      .setColor(EMBED_COLORS.SUCCESS)
      .setTimestamp();
  }

  /**
   * Create loading embed
   */
  createLoadingEmbed(message: string = 'Fetching fresh data from poe.ninja...'): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('⏳ Loading')
      .setDescription(message + '\n\nThis may take a few seconds if the cache is being refreshed.')
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();
  }

  /**
   * Create Trinity calculation embed
   */
  createTrinityEmbed(
    inputs: {
      fireMin: number; fireMax: number;
      coldMin: number; coldMax: number;
      lightningMin: number; lightningMax: number;
      gemLevel: number;
    },
    result: {
      avgResonance: { fire: number; cold: number; lightning: number };
      totalResonance: number;
      damageBonus: number;
      distribution: { fire: number; cold: number; lightning: number };
      efficiency: number;
      recommendation?: string;
      weakElement?: string;
    }
  ): EmbedBuilder {
    const efficiencyColor = result.efficiency >= 80 ? EMBED_COLORS.SUCCESS :
                            result.efficiency >= 60 ? EMBED_COLORS.INFO :
                            result.efficiency >= 40 ? EMBED_COLORS.NEUTRAL :
                            EMBED_COLORS.ERROR;

    const fields = [
      {
        name: 'Damage Ranges',
        value: `Fire: ${inputs.fireMin}-${inputs.fireMax}\nCold: ${inputs.coldMin}-${inputs.coldMax}\nLightning: ${inputs.lightningMin}-${inputs.lightningMax}`,
        inline: true
      },
      {
        name: 'Hit Distribution',
        value: `Fire: ${result.distribution.fire}%\nCold: ${result.distribution.cold}%\nLightning: ${result.distribution.lightning}%`,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      {
        name: 'Average Resonance',
        value: `Fire: ${result.avgResonance.fire}\nCold: ${result.avgResonance.cold}\nLightning: ${result.avgResonance.lightning}`,
        inline: true
      },
      {
        name: 'Performance',
        value: `Total: ${result.totalResonance}/300\nDamage Bonus: **${result.damageBonus}%** more\nEfficiency: **${result.efficiency}%**`,
        inline: true
      }
    ];

    // Add recommendation if build is 2-element focused
    if (result.recommendation) {
      fields.push({
        name: '\u200B',
        value: '\u200B',
        inline: true
      });
      fields.push({
        name: '💡 Multi-Skill Recommendation',
        value: result.recommendation,
        inline: false
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚡ Trinity Support Efficiency')
      .setDescription(`**Gem Level:** ${inputs.gemLevel}\n\n*Single-skill steady-state calculation. For multi-skill rotations, combine with other element skills to approach 300/300 resonance.*`)
      .setColor(efficiencyColor)
      .addFields(fields)
      .setFooter({ text: 'Efficiency normalized to max achievable with perfect 33.3% balance (~214 total resonance)' })
      .setTimestamp();

    return embed;
  }

  /**
   * Create help embed
   */
  createHelpEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('📚 PoE2 Economy Bot - Help')
      .setDescription('Get real-time Path of Exile 2 economy information powered by poe.ninja')
      .setColor(EMBED_COLORS.INFO)
      .addFields(
        {
          name: '/price [currency] [league]',
          value: 'Get current price and stats for a currency with trends',
          inline: false
        },
        {
          name: '/compare [currency1] [currency2] [league]',
          value: 'Compare two currencies side by side',
          inline: false
        },
        {
          name: '/movers [type] [league] [limit]',
          value: 'Show biggest price movers (gainers/losers)',
          inline: false
        },
        {
          name: '/search [query] [league]',
          value: 'Search for currencies by name',
          inline: false
        },
        {
          name: '/league',
          value: 'View and manage league preferences',
          inline: false
        },
        {
          name: '/trends [league]',
          value: 'View market overview and trends',
          inline: false
        },
        {
          name: '/chart [currency] [timeframe] [league]',
          value: 'Generate price history chart',
          inline: false
        }
      )
      .setFooter({ text: 'Data updates every 5 minutes • Powered by poe.ninja' })
      .setTimestamp();
  }
}

export const embedBuilder = new EmbedBuilderService();
