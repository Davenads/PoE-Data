import axios, { AxiosInstance } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { rateLimiter } from './rate-limiter';
import { redisStore } from './redis-store';
import { API_HEADERS, CURRENCY_KEYWORDS, PUPPETEER_CONFIG } from '../config/constants';
import type {
  CurrencyData,
  CurrencyOverviewResponse,
  ScrapedCurrencyData
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
   * Fetch currency data (tries API first, falls back to scraping)
   */
  async fetchCurrencyData(league: string): Promise<CurrencyData[]> {
    // Try API first
    try {
      logger.info(`Attempting API fetch for league: ${league}`);
      const data = await this.fetchFromAPI(league);
      if (data && data.length > 0) {
        logger.info(`Successfully fetched ${data.length} currencies from API`);
        return data;
      }
    } catch (error) {
      logger.warn('API fetch failed, falling back to browser scraping:', error);
    }

    // Fall back to browser scraping
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

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(API_HEADERS['User-Agent']);

        // Navigate to poe.ninja economy page
        const url = `${config.poeNinja.webUrl}/poe2/economy/${league}/currency`;
        logger.info(`Navigating to: ${url}`);

        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: PUPPETEER_CONFIG.NAVIGATION_TIMEOUT
        });

        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, PUPPETEER_CONFIG.NETWORK_IDLE_TIMEOUT));

        // Extract currency data from table
        const currencies = await page.evaluate((keywords: string[]) => {
          const results: ScrapedCurrencyData[] = [];
          const rows = document.querySelectorAll('table tbody tr');

          rows.forEach(row => {
            try {
              const cells = row.querySelectorAll('td');
              if (cells.length < 2) return;

              // Get currency name (usually first or second cell)
              let currencyName = '';
              let chaosValue = 0;
              let volumePerHour = 0;
              let changePercent = 0;

              // Try to find currency name
              for (let i = 0; i < Math.min(cells.length, 3); i++) {
                const text = cells[i].textContent?.trim() || '';
                const hasKeyword = keywords.some(kw => text.includes(kw));

                if (hasKeyword && !currencyName) {
                  currencyName = text;
                  break;
                }
              }

              if (!currencyName) return;

              // Parse chaos value
              for (let i = 0; i < cells.length; i++) {
                const text = cells[i].textContent?.trim() || '';

                // Look for chaos value (number with possible k/m/b suffix)
                const priceMatch = text.match(/([\d.]+)([kmb])?/i);
                if (priceMatch && !chaosValue) {
                  let value = parseFloat(priceMatch[1]);
                  const suffix = priceMatch[2]?.toLowerCase();

                  if (suffix === 'k') value *= 1000;
                  if (suffix === 'm') value *= 1000000;
                  if (suffix === 'b') value *= 1000000000;

                  chaosValue = value;
                }

                // Look for percentage change
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
    const currency = currencies.find(
      c => c.currencyTypeName.toLowerCase() === currencyName.toLowerCase()
    );

    if (currency) {
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
