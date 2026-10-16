import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium } from 'playwright';
import { prisma } from '../database/prisma.js';
import { SessionManager } from './session.manager.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  const [telegramIdArg, cookieFile] = process.argv.slice(2);
  const telegramId = Number(telegramIdArg);

  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    throw new Error('Usage: npm run session:connect -- <telegram-user-id> [cookies.json]');
  }

  await prisma.$connect();

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) {
      throw new Error('Start the Telegram bot with /start first so your user record exists.');
    }

    let serializedCookies: string;
    if (cookieFile) {
      serializedCookies = await readFile(cookieFile, 'utf8');
    } else {
      const browser = await chromium.launch({ headless: false });
      try {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://www.olx.kz/', { waitUntil: 'domcontentloaded' });

        const terminal = createInterface({ input: stdin, output: stdout });
        try {
          await terminal.question(
            'Войдите в свой аккаунт OLX в открытом браузере, затем нажмите Enter здесь. Пароль вводите только на сайте OLX.\n',
          );
        } finally {
          terminal.close();
        }

        const cookies = await context.cookies('https://www.olx.kz');
        serializedCookies = JSON.stringify(cookies);
      } finally {
        await browser.close();
      }
    }

    const cookies = SessionManager.parseCookies(serializedCookies);
    if (cookies.length === 0) {
      throw new Error('No OLX cookies were found. Check that you logged in or selected the correct cookie file.');
    }

    const encryptedCookies = SessionManager.toEncryptedStorage(JSON.stringify(cookies));
    const expirationTimes = cookies
      .map((cookie) => cookie.expires)
      .filter((expires): expires is number => expires !== undefined && expires > 0);
    const expiresAt = expirationTimes.length > 0
      ? new Date(Math.min(...expirationTimes) * 1000)
      : null;

    await prisma.session.create({
      data: {
        userId: user.id,
        encryptedCookies,
        expiresAt,
      },
    });

    console.log('OLX session saved encrypted. Cookie values were not printed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Session setup failed');
  process.exitCode = 1;
});
