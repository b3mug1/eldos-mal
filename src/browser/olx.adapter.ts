import { chromium, type Browser, type Page } from 'playwright';
import { validateOlxUrl } from '../utils/security.js';
import { logger } from '../utils/logger.js';
import { BrowserManager } from './browser.manager.js';

export type OlxEngagementRequest = {
  listingUrl: string;
  cookies?: string;
  likesTarget?: number;
  phoneTarget?: number;
};

export type OlxEngagementResult = {
  success: boolean;
  listingUrl: string;
  likesCompleted: number;
  phoneViewsCompleted: number;
  warnings: string[];
  message: string;
};

export class OlxEngagementAdapter {
  private readonly browserManager = new BrowserManager();

  async execute(request: OlxEngagementRequest): Promise<OlxEngagementResult> {
    const validation = validateOlxUrl(request.listingUrl);
    if (!validation.valid) {
      return {
        success: false,
        listingUrl: request.listingUrl,
        likesCompleted: 0,
        phoneViewsCompleted: 0,
        warnings: [validation.reason ?? 'URL validation failed.'],
        message: 'Введённый URL не проходит проверку OLX.',
      };
    }

    const page = await this.browserManager.openPage();

    try {
      const cookieRecords = this.parseCookies(request.cookies ?? '');
      if (cookieRecords.length > 0) {
        await page.context().addCookies(
          cookieRecords.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain ?? 'www.olx.kz',
            path: cookie.path ?? '/',
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
          })),
        );
      }

      await page.goto(validation.normalizedUrl!, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

      const likesCompleted = await this.triggerLikes(page, request.likesTarget ?? 50);
      const phoneViewsCompleted = await this.triggerPhoneViews(page, request.phoneTarget ?? 50);
      const warnings: string[] = [];

      if (likesCompleted === 0 && phoneViewsCompleted === 0) {
        warnings.push('OLX не отобразил ожидаемые элементы. Применён безопасный режим и бот не утверждает, что действия реально выполнены.');
      }

      return {
        success: true,
        listingUrl: validation.normalizedUrl!,
        likesCompleted,
        phoneViewsCompleted,
        warnings,
        message: `Обработка объявления завершена. Выполнено ${likesCompleted} лайков и ${phoneViewsCompleted} показов телефона.`,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to automate OLX listing');
      return {
        success: false,
        listingUrl: validation.normalizedUrl ?? request.listingUrl,
        likesCompleted: 0,
        phoneViewsCompleted: 0,
        warnings: [error instanceof Error ? error.message : 'Unexpected browser automation error.'],
        message: 'Ошибка во время автоматизации OLX.',
      };
    } finally {
      await page.close();
      await this.browserManager.close();
    }
  }

  private parseCookies(rawCookies: string): Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> {
    if (!rawCookies) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawCookies);
      if (Array.isArray(parsed)) {
        return parsed as Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }>;
      }
    } catch {
      // fallback below
    }

    return rawCookies
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...rest] = pair.split('=');
        return {
          name,
          value: rest.join('='),
          domain: 'www.olx.kz',
          path: '/',
          secure: true,
          sameSite: 'Lax' as const,
        };
      });
  }

  private async triggerLikes(page: Page, target: number): Promise<number> {
    let clicked = 0;
    for (let index = 0; index < target; index += 1) {
      const candidate = page.locator('button, a, [role="button"]').filter({ hasText: /нравится|like|лайк|избранное|favorite/i }).first();
      const count = await candidate.count().catch(() => 0);
      if (count === 0) {
        break;
      }

      try {
        await candidate.click({ timeout: 2000, force: true });
        clicked += 1;
      } catch {
        break;
      }
    }

    return clicked;
  }

  private async triggerPhoneViews(page: Page, target: number): Promise<number> {
    let clicked = 0;
    for (let index = 0; index < target; index += 1) {
      const candidate = page.locator('button, a, [role="button"]').filter({ hasText: /показать телефон|телефон|show phone|phone/i }).first();
      const count = await candidate.count().catch(() => 0);
      if (count === 0) {
        break;
      }

      try {
        await candidate.click({ timeout: 2000, force: true });
        clicked += 1;
      } catch {
        break;
      }
    }

    return clicked;
  }
}
