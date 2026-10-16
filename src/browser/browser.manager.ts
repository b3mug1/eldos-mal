import { chromium, type Browser, type Page } from 'playwright';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class BrowserManager {
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: config.BROWSER_HEADLESS,
      });
    }

    return this.browser;
  }

  async close(): Promise<void> {
    if (!this.browser) {
      return;
    }

    await this.browser.close();
    this.browser = null;
    logger.info('Browser closed');
  }

  async openPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    return context.newPage();
  }
}
