import axios, { AxiosInstance } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { rateLimiter } from './rate-limiter';
import { redisStore } from './redis-store';
import { getLeagueUrlSlug } from '../utils/validators';
import { API_HEADERS, CURRENCY_KEYWORDS, PUPPETEER_CONFIG, POE2_API_LEAGUE_NAMES } from '../config/constants';
import type {
  CurrencyData,
  CurrencyOverviewResponse,
  ScrapedCurrencyData,
  Poe2ApiResponse
} from '../models/types';

/**
 * Client for fetching data from poe.ninja (API + browser scraping)
 */
export class PoeNinjaClient {
  private axiosClient: AxiosInstance;
  private browser: Browser | null = null;

  constructor() {
    this.axiosClient = axios.create({
      baseURL: config.poeNinja.apiUrl,
      timeout: 10000,
      headers: API_HEADERS
    });
  }

  /**
   * Fetch currency data (tries PoE2 API, then PoE1 API, then falls back to scraping)
   */
  async fetchCurrencyData(league: string): Promise<CurrencyData[]> {
    // Try PoE2 Direct API first (FASTEST - ~200ms)
    try {
      logger.info(`Attempting PoE2 direct API fetch for league: ${league}`);
      const data = await this.fetchFromPoe2Api(league);
      if (data && data.length > 0) {
        logger.info(`✅ Successfully fetched ${data.length} currencies from PoE2 API (~200ms)`);
        return data;
      }
    } catch (error) {
      logger.debug('PoE2 API fetch failed (expected for PoE1 leagues):', error);
    }

    // Try PoE1 API (for PoE1 leagues)
    try {
      logger.info(`Attempting PoE1 API fetch for league: ${league}`);
      const data = await this.fetchFromAPI(league);
      if (data && data.length > 0) {
        logger.info(`Successfully fetched ${data.length} currencies from PoE1 API`);
        return data;
      }
    } catch (error) {
      logger.warn('PoE1 API fetch failed, falling back to browser scraping:', error);
    }

    // Fall back to browser scraping (SLOWEST - ~5-10s)
    try {
      logger.info(`Attempting browser scrape for league: ${league}`);
      const data = await this.scrapeFromBrowser(league);
      logger.info(`Successfully scraped ${data.length} currencies from browser`);
      return this.convertScrapedData(data);
    } catch (error) {
      logger.error('Browser scraping failed:', error);
      throw new Error(`Failed to fetch data for league ${league}: ${error}`);
    }
  }

  /**
   * Fetch data from PoE2 Direct API (FASTEST - ~200ms)
   * This is an undocumented API discovered via network interception
   */
  private async fetchFromPoe2Api(league: string): Promise<CurrencyData[]> {
    const endpoint = 'poeninja:poe2api';

    // Map display league name to API league name
    const apiLeagueName = POE2_API_LEAGUE_NAMES[league] || league;

    return await rateLimiter.waitAndExecute(endpoint, async () => {
      try {
        const response = await this.axiosClient.get<Poe2ApiResponse>(
          'https://poe.ninja/poe2/api/economy/currencyexchange/overview',
          {
            params: {
              leagueName: apiLeagueName,
              overviewName: 'Currency'
            },
            baseURL: '' // Override baseURL for this specific request
          }
        );

        if (!response.data || !response.data.lines || !response.data.items) {
          throw new Error('Invalid PoE2 API response structure');
        }

        // Convert PoE2 API format to our CurrencyData format
        return this.convertPoe2ApiData(response.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          logger.debug(`League ${league} not found in PoE2 API (may be PoE1 league)`);
          return [];
        }
        throw error;
      }
    });
  }

  /**
   * Convert PoE2 API response to CurrencyData format
   *
   * IMPORTANT: PoE2 API returns prices relative to Divine Orbs, not Chaos Orbs!
   * primaryValue represents "how many of this currency per 1 Divine"
   *
   * Example:
   * - Chaos Orb: primaryValue = 28.94 means "28.94 Chaos per 1 Divine"
   * - Divine Orb: primaryValue = 1 means "1 Divine per 1 Divine"
   * - Exalted Orb: primaryValue = 6.18 means "6.18 Exalted per 1 Divine"
   *
   * To convert to "Chaos per item":
   * - chaosPerItem = (Chaos per Divine) / (Items per Divine)
   */
  private convertPoe2ApiData(apiData: Poe2ApiResponse): CurrencyData[] {
    // Create a map of currency IDs to names
    const itemMap = new Map(apiData.items.map(item => [item.id, item]));

    // Find Chaos Orb to get the Divine-to-Chaos conversion rate
    const chaosOrbLine = apiData.lines.find(line => {
      const item = itemMap.get(line.id);
      return item?.name.toLowerCase() === 'chaos orb';
    });

    // Chaos Orb's primaryValue = "Divines per Chaos"
    // To get "Chaos per Divine", we need to invert it
    // If not found, assume Divine = 180 Chaos (approximate PoE2 standard rate)
    const chaosOrbPrimaryValue = chaosOrbLine?.primaryValue || (1 / 180);
    const chaosPerDivine = 1 / chaosOrbPrimaryValue;

    logger.debug(`Divine-to-Chaos conversion rate: 1 Divine = ${chaosPerDivine.toFixed(2)} Chaos (Chaos Orb primaryValue = ${chaosOrbPrimaryValue})`);

    return apiData.lines.map(line => {
      const item = itemMap.get(line.id);
      const currencyName = item?.name || line.id;

      // Convert Divine-based price to Chaos-based price
      // primaryValue represents "Divines per item"
      // Formula: (item price in divines) / (divines per chaos) = Chaos per Item
      const chaosEquivalent = line.primaryValue / chaosOrbPrimaryValue;

      return {
        currencyTypeName: currencyName,
        chaosEquivalent: chaosEquivalent,
        paySparkLine: {
          data: line.sparkline?.data || [],
          totalChange: line.sparkline?.totalChange || 0
        },
        receiveSparkLine: {
          data: line.sparkline?.data || [],
          totalChange: line.sparkline?.totalChange || 0
        },
        pay: {
          count: 0,
          value: chaosEquivalent,
          listing_count: Math.round(line.volumePrimaryValue || 0),
          sample_time_utc: new Date().toISOString()
        }
      };
    });
  }

  /**
   * Fetch data from poe.ninja API
   */
  private async fetchFromAPI(league: string): Promise<CurrencyData[]> {
    const endpoint = 'poeninja:api';

    return await rateLimiter.waitAndExecute(endpoint, async () => {
      try {
        const response = await this.axiosClient.get<CurrencyOverviewResponse>(
          '/currencyoverview',
          {
            params: {
              league,
              type: 'Currency'
            }
          }
        );

        if (!response.data || !response.data.lines) {
          throw new Error('Invalid API response structure');
        }

        return response.data.lines;
      } catch (error: any) {
        if (error.response?.status === 404) {
          logger.warn(`League ${league} not found in API`);
          return [];
        }
        throw error;
      }
    });
  }

  /**
   * Scrape data from poe.ninja website using Puppeteer
   */
  private async scrapeFromBrowser(league: string): Promise<ScrapedCurrencyData[]> {
    const endpoint = 'poeninja:scrape';

    return await rateLimiter.waitAndExecute(endpoint, async () => {
      let page: Page | null = null;

      try {
        // Initialize browser if needed
        if (!this.browser) {
          await this.initBrowser();
        }

        if (!this.browser) {
          throw new Error('Failed to initialize browser');
        }

        page = await this.browser.newPage();

        // Capture console logs from the page
        page.on('console', (msg) => {
          if (msg.text().includes('[Puppeteer Debug]')) {
            logger.info(msg.text());
          }
        });

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(API_HEADERS['User-Agent']);

        // Convert league name to URL slug
        const leagueSlug = getLeagueUrlSlug(league);
        const url = `${config.poeNinja.webUrl}/poe2/economy/${leagueSlug}/currency`;
        logger.info(`[Puppeteer] Navigating to: ${url}`);
        logger.info(`[Puppeteer] League display name: "${league}" -> URL slug: "${leagueSlug}"`);

        try {
          await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: PUPPETEER_CONFIG.NAVIGATION_TIMEOUT
          });
          logger.info(`[Puppeteer] Successfully loaded page`);
        } catch (navError: any) {
          logger.error(`[Puppeteer] Navigation failed: ${navError.message}`);
          logger.error(`[Puppeteer] URL attempted: ${url}`);
          throw navError;
        }

        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, PUPPETEER_CONFIG.NETWORK_IDLE_TIMEOUT));
        logger.info(`[Puppeteer] Finished waiting for React render, extracting data...`);

        // Extract currency data from table
        const currencies = await page.evaluate((keywords: string[]) => {
          const results: ScrapedCurrencyData[] = [];
          const rows = document.querySelectorAll('table tbody tr');

          rows.forEach((row, rowIndex) => {
            try {
              const cells = row.querySelectorAll('td');
              if (cells.length < 2) return;

              // Debug: Log all cell contents for first few rows and specific currencies
              const shouldDebug = rowIndex < 3;
              if (shouldDebug) {
                const cellContents = Array.from(cells).map((cell, i) => `[${i}]: "${cell.textContent?.trim()}"`);
                console.log(`[Puppeteer Debug] Row ${rowIndex} cells:`, cellContents.join(' | '));
              }

              let currencyName = '';
              let nameColumnIndex = -1;
              let chaosValue = 0;
              let volumePerHour = 0;
              let changePercent = 0;

              // Find currency name and remember which column it's in
              for (let i = 0; i < Math.min(cells.length, 3); i++) {
                const text = cells[i].textContent?.trim() || '';
                const hasKeyword = keywords.some(kw => text.includes(kw));

                if (hasKeyword && !currencyName) {
                  // Remove "wiki" suffix if present
                  currencyName = text.replace(/wiki$/i, '').trim();
                  nameColumnIndex = i;
                  break;
                }
              }

              if (!currencyName) return;

              // Debug specific currencies
              const debugCurrencies = ['Exalted Orb', 'Divine Orb', 'Chaos Orb'];
              const isDebugCurrency = debugCurrencies.some(dc => currencyName.includes(dc));
              if (isDebugCurrency) {
                const cellContents = Array.from(cells).map((cell, i) => `[${i}]: "${cell.textContent?.trim()}"`);
                console.log(`[Puppeteer Debug] ${currencyName} cells:`, cellContents.join(' | '));
              }

              // Parse chaos value - poe.ninja shows prices in two ways:
              // - Expensive items (>1c): Column 1 shows "chaos per item"
              // - Cheap items (<1c): Column 3 shows "items per chaos" (needs inverse)
              // We check both columns and use the appropriate value
              let col1Value = 0;
              let col3Value = 0;

              // Parse column 1 (after name)
              if (nameColumnIndex + 1 < cells.length) {
                const text = cells[nameColumnIndex + 1].textContent?.trim() || '';
                const priceMatch = text.match(/^([\d.]+)([kmb])?$/i);
                if (priceMatch) {
                  let value = parseFloat(priceMatch[1]);
                  const suffix = priceMatch[2]?.toLowerCase();
                  if (suffix === 'k') value *= 1000;
                  if (suffix === 'm') value *= 1000000;
                  if (suffix === 'b') value *= 1000000000;
                  col1Value = value;
                }
              }

              // Parse column 3 (2 columns after name)
              if (nameColumnIndex + 3 < cells.length) {
                const text = cells[nameColumnIndex + 3].textContent?.trim() || '';
                const priceMatch = text.match(/^([\d.]+)([kmb])?$/i);
                if (priceMatch) {
                  let value = parseFloat(priceMatch[1]);
                  const suffix = priceMatch[2]?.toLowerCase();
                  if (suffix === 'k') value *= 1000;
                  if (suffix === 'm') value *= 1000000;
                  if (suffix === 'b') value *= 1000000000;
                  col3Value = value;
                }
              }

              // Determine which value to use:
              // If col3 > col1, it means col3 shows "items per chaos" (e.g., 60 ex per 1c)
              // In this case, we need to invert: chaosValue = 1 / col3Value
              // Otherwise, col1 shows "chaos per item" directly
              if (col3Value > col1Value && col3Value > 1) {
                // Cheap item: invert the ratio
                chaosValue = 1 / col3Value;
                if (isDebugCurrency) {
                  console.log(`[Puppeteer Debug] ${currencyName} - Cheap item detected. Col3=${col3Value} items/chaos → ${chaosValue.toFixed(4)}c per item`);
                }
              } else if (col1Value > 0) {
                // Expensive item: use col1 directly
                chaosValue = col1Value;
                if (isDebugCurrency) {
                  console.log(`[Puppeteer Debug] ${currencyName} - Expensive item detected. Col1=${col1Value}c per item`);
                }
              }

              // Look for percentage change
              for (let i = 0; i < cells.length; i++) {
                const text = cells[i].textContent?.trim() || '';
                const changeMatch = text.match(/([+-]?[\d.]+)%/);
                if (changeMatch && !changePercent) {
                  changePercent = parseFloat(changeMatch[1]);
                }
              }

              if (currencyName && chaosValue > 0) {
                results.push({
                  currencyTypeName: currencyName,
                  chaosEquivalent: chaosValue,
                  volumePerHour,
                  changePercent
                });
              }
            } catch (error) {
              console.error('Error parsing row:', error);
            }
          });

          return results;
        }, CURRENCY_KEYWORDS as unknown as string[]);

        logger.info(`Scraped ${currencies.length} currencies`);

        // Debug: Log all scraped currency names
        if (currencies.length > 0) {
          logger.info(`[Puppeteer] Scraped currency names: ${currencies.map(c => c.currencyTypeName).join(', ')}`);
        }

        return currencies;

      } finally {
        if (page) {
          await page.close();
        }
      }
    });
  }

  /**
   * Convert scraped data to CurrencyData format
   */
  private convertScrapedData(scraped: ScrapedCurrencyData[]): CurrencyData[] {
    return scraped.map(item => ({
      currencyTypeName: item.currencyTypeName,
      chaosEquivalent: item.chaosEquivalent,
      paySparkLine: {
        data: [],
        totalChange: item.changePercent || 0
      },
      receiveSparkLine: {
        data: [],
        totalChange: item.changePercent || 0
      },
      pay: {
        count: 0,
        value: item.chaosEquivalent,
        listing_count: 0,
        sample_time_utc: new Date().toISOString()
      }
    }));
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(): Promise<void> {
    try {
      logger.info('Initializing Puppeteer browser...');

      this.browser = await puppeteer.launch({
        headless: PUPPETEER_CONFIG.HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      logger.info('Puppeteer browser initialized');
    } catch (error) {
      logger.error('Failed to initialize Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Get specific currency data
   */
  async getCurrency(league: string, currencyName: string): Promise<CurrencyData | null> {
    // Check cache first
    const cached = await redisStore.getCurrencyData(league, currencyName);
    if (cached) {
      logger.debug(`Cache hit for ${currencyName} in ${league}`);
      return cached;
    }

    // Fetch all currencies and find the one we need
    const currencies = await this.fetchCurrencyData(league);

    logger.info(`Searching for "${currencyName}" among ${currencies.length} currencies`);

    const currency = currencies.find(
      c => c.currencyTypeName.toLowerCase() === currencyName.toLowerCase()
    );

    if (!currency) {
      logger.warn(`Currency "${currencyName}" not found. Available currencies: ${currencies.map(c => c.currencyTypeName).slice(0, 10).join(', ')}...`);
    } else {
      logger.info(`Found currency: ${currency.currencyTypeName}`);

      // Store in cache
      await redisStore.storeCurrencyData(league, currencyName, currency);

      // Store price history
      await redisStore.storePriceHistory(
        league,
        currencyName,
        currency.chaosEquivalent,
        currency.pay.listing_count
      );
    }

    return currency || null;
  }

  /**
   * Get all currencies for a league
   */
  async getAllCurrencies(league: string): Promise<CurrencyData[]> {
    const currencies = await this.fetchCurrencyData(league);

    // Cache each currency
    for (const currency of currencies) {
      await redisStore.storeCurrencyData(league, currency.currencyTypeName, currency);
    }

    return currencies;
  }

  /**
   * Get currency names list (for autocomplete)
   */
  async getCurrencyNames(league: string): Promise<string[]> {
    // Check cache
    const cached = await redisStore.getDiscordCache(`currencies:${league}:list`);
    if (cached) {
      return cached;
    }

    const currencies = await this.fetchCurrencyData(league);
    const names = currencies.map(c => c.currencyTypeName).sort();

    // Cache the list
    await redisStore.storeDiscordCache(`currencies:${league}:list`, names, 300);

    return names;
  }

  /**
   * Close browser and cleanup
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed');
    }
  }
}

// Export singleton instance
export const poeNinjaClient = new PoeNinjaClient();

// Cleanup on process exit
process.on('SIGTERM', () => poeNinjaClient.cleanup());
process.on('SIGINT', () => poeNinjaClient.cleanup());
