import { EmbedBuilder } from 'discord.js';
import { EMBED_COLORS } from '../config/constants';
import {
  formatChaosPrice,
  formatPercentChange,
  formatNumber,
  formatRelativeTime,
  getPriceChangeEmoji,
  getSentimentEmoji,
  formatPrice
} from '../utils/formatters';
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
  createPriceEmbed(currency: CurrencyData, league: string): EmbedBuilder {
    const change = currency.paySparkLine.totalChange;
    const emoji = getPriceChangeEmoji(change);
    const color = change > 0 ? EMBED_COLORS.BULLISH : change < 0 ? EMBED_COLORS.BEARISH : EMBED_COLORS.NEUTRAL;

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${currency.currencyTypeName}`)
      .setDescription(`**${league}** League`)
      .setColor(color)
      .addFields(
        {
          name: '💰 Current Price',
          value: `${formatChaosPrice(currency.chaosEquivalent)}`,
          inline: true
        },
        {
          name: '📈 24h Change',
          value: `${formatPercentChange(change)} ${emoji}`,
          inline: true
        },
        {
          name: '📦 Listings',
          value: formatNumber(currency.pay.listing_count),
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

    // Format exchange rates based on which makes more sense to display
    let exchangeRateText: string;
    if (ratio1to2 >= 1) {
      // If ratio is >= 1, show currency1 -> currency2
      exchangeRateText = `1 ${currency1.currencyTypeName} = **${formatRatio(ratio1to2)}** ${currency2.currencyTypeName}`;
      if (ratio2to1 >= 0.001) {
        exchangeRateText += `\n1 ${currency2.currencyTypeName} = **${formatRatio(ratio2to1)}** ${currency1.currencyTypeName}`;
      }
    } else {
      // If ratio is < 1, flip it for better readability
      exchangeRateText = `1 ${currency2.currencyTypeName} = **${formatRatio(ratio2to1)}** ${currency1.currencyTypeName}`;
      if (ratio1to2 >= 0.001) {
        exchangeRateText += `\n1 ${currency1.currencyTypeName} = **${formatRatio(ratio1to2)}** ${currency2.currencyTypeName}`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚖️ Currency Comparison`)
      .setDescription(`**${league}** League`)
      .setColor(EMBED_COLORS.INFO)
      .addFields(
        {
          name: `${currency1.currencyTypeName}`,
          value: `${formatChaosPrice(currency1.chaosEquivalent)}\n${formatPercentChange(currency1.paySparkLine.totalChange)}`,
          inline: true
        },
        {
          name: 'vs',
          value: '⚖️',
          inline: true
        },
        {
          name: `${currency2.currencyTypeName}`,
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
          value: `**${betterPerformer}**`,
          inline: false
        }
      )
      .setTimestamp();

    return embed;
  }

  /**
   * Create embed for market movers
   */
  createMoversEmbed(
    gainers: MoverData[],
    losers: MoverData[],
    league: string
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`🚀 Market Movers - ${league}`)
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    if (gainers.length > 0) {
      const gainersText = gainers
        .map((m, i) => {
          const emoji = getPriceChangeEmoji(m.changePercent);
          return `${i + 1}. **${m.currencyTypeName}**: ${formatPercentChange(m.changePercent)} ${emoji}\n   ${formatChaosPrice(m.previousPrice)} → ${formatChaosPrice(m.currentPrice)}`;
        })
        .join('\n\n');

      embed.addFields({
        name: '📈 Top Gainers',
        value: gainersText,
        inline: false
      });
    }

    if (losers.length > 0) {
      const losersText = losers
        .map((m, i) => {
          const emoji = getPriceChangeEmoji(m.changePercent);
          return `${i + 1}. **${m.currencyTypeName}**: ${formatPercentChange(m.changePercent)} ${emoji}\n   ${formatChaosPrice(m.previousPrice)} → ${formatChaosPrice(m.currentPrice)}`;
        })
        .join('\n\n');

      embed.addFields({
        name: '📉 Top Losers',
        value: losersText,
        inline: false
      });
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
        const emoji = getPriceChangeEmoji(c.paySparkLine.totalChange);
        return `${i + 1}. **${c.currencyTypeName}** - ${formatChaosPrice(c.chaosEquivalent)} (${formatPercentChange(c.paySparkLine.totalChange)} ${emoji})`;
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

    const embed = new EmbedBuilder()
      .setTitle(`📊 Market Trends - ${trends.league}`)
      .setColor(
        trends.sentiment === 'bullish' ? EMBED_COLORS.BULLISH :
        trends.sentiment === 'bearish' ? EMBED_COLORS.BEARISH :
        EMBED_COLORS.NEUTRAL
      )
      .addFields(
        {
          name: '🔥 Most Active (24h)',
          value: `**${trends.mostActive.currency}**\n${formatNumber(trends.mostActive.volume)} volume`,
          inline: true
        },
        {
          name: '💎 Most Valuable',
          value: `**${trends.mostValuable.currency}**\n${formatChaosPrice(trends.mostValuable.price)}`,
          inline: true
        },
        {
          name: '\u200B',
          value: '\u200B',
          inline: true
        },
        {
          name: '📈 Market Sentiment',
          value: `${sentimentEmoji} **${trends.sentiment.charAt(0).toUpperCase() + trends.sentiment.slice(1)}**\nAverage 24h change: ${formatPercentChange(trends.averageChange24h)}`,
          inline: true
        },
        {
          name: '⚡ Volatility Index',
          value: `${trends.volatilityIndex.toFixed(1)}%\n(Market average)`,
          inline: true
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
          value: 'Get current price and stats for a currency',
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
