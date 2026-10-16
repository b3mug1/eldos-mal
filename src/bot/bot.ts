import { Telegraf, type Context } from 'telegraf';
import type { TaskStatus } from '@prisma/client';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { mainMenuKeyboard } from './keyboards/main.js';
import { sessionsKeyboard } from './keyboards/sessions.js';
import { ensureUserRecord, requireTelegramUser } from './middleware/access.js';
import { addListing } from '../modules/listings/listing.service.js';
import { getTaskStats, getTasksByTelegramUser } from '../modules/tasks/task.service.js';
import { buildStatsSummary, buildTaskSummary } from '../modules/reports/report.service.js';
import { getUserByTelegramId } from '../modules/users/user.service.js';
import { sanitizeForLog } from '../utils/security.js';
import { checkRateLimit } from '../utils/rate-limit.js';

export function createBot() {
  const bot = new Telegraf<Context>(config.BOT_TOKEN);

  bot.use(requireTelegramUser);
  bot.use(ensureUserRecord);

  bot.command('start', async (ctx) => {
    const user = ctx.from;
    await ctx.reply(
      `👋 Добро пожаловать, ${user?.first_name ?? 'пользователь'}!\n\nOLX Engagement Bot\n\nДоступные действия:`,
      mainMenuKeyboard,
    );
  });

  bot.command('add_listing', async (ctx) => {
    await ctx.reply('📦 Отправьте ссылку на OLX-объявление в формате:\nhttps://www.olx.kz/d/obyavlenie/example-ID123.html');
  });

  bot.command('check_listing', async (ctx) => {
    await ctx.reply('🔎 Отправьте ссылку на объявление для проверки.');
  });

  bot.command('stats', async (ctx) => {
    const stats = await getTaskStats(Number(ctx.from?.id ?? 0));
    await ctx.reply(buildStatsSummary(stats));
  });

  bot.command('my_tasks', async (ctx) => {
    const tasks = await getTasksByTelegramUser(Number(ctx.from?.id ?? 0));
    if (tasks.length === 0) {
      await ctx.reply('📋 У вас пока нет задач.');
      return;
    }

    const summary = tasks
      .slice(0, 5)
      .map((task: { id: string; url: string; status: TaskStatus; createdAt: Date; completedAt: Date | null; result: unknown; error: string | null }) => buildTaskSummary(task))
      .join('\n\n');

    await ctx.reply(summary);
  });

  bot.command('sessions', async (ctx) => {
    const user = await getUserByTelegramId(Number(ctx.from?.id ?? 0));
    await ctx.reply(
      user
        ? '🔐 Выберите способ подключения. Пароль OLX не отправляйте боту: вход открывается только в локальном браузере.'
        : 'Сначала отправьте /start.',
      sessionsKeyboard,
    );
  });

  bot.command('settings', async (ctx) => {
    await ctx.reply('⚙️ Настройки будут доступны позже. Сейчас поддерживаются базовые параметры безопасности.');
  });

  bot.action('add_listing', async (ctx) => {
    await ctx.reply('📦 Отправьте ссылку на OLX-объявление.');
    await ctx.answerCbQuery();
  });

  bot.action('check_listing', async (ctx) => {
    await ctx.reply('🔎 Отправьте URL объявления для проверки.');
    await ctx.answerCbQuery();
  });

  bot.action('stats', async (ctx) => {
    const stats = await getTaskStats(Number(ctx.from?.id ?? 0));
    await ctx.reply(buildStatsSummary(stats));
    await ctx.answerCbQuery();
  });

  bot.action('my_tasks', async (ctx) => {
    const tasks = await getTasksByTelegramUser(Number(ctx.from?.id ?? 0));
    if (tasks.length === 0) {
      await ctx.reply('📋 Нет задач.');
      await ctx.answerCbQuery();
      return;
    }

    await ctx.reply(
      tasks
        .slice(0, 5)
        .map((task: { id: string; url: string; status: TaskStatus; createdAt: Date; completedAt: Date | null; result: unknown; error: string | null }) => buildTaskSummary(task))
        .join('\n\n'),
    );
    await ctx.answerCbQuery();
  });

  bot.action('sessions', async (ctx) => {
    await ctx.reply(
      '🔐 Выберите способ подключения. Пароль OLX не отправляйте боту: вход открывается только в локальном браузере.',
      sessionsKeyboard,
    );
    await ctx.answerCbQuery();
  });

  bot.action('session_cookies', async (ctx) => {
    const telegramUserId = Number(ctx.from.id);
    await ctx.reply(
      [
        '🍪 Импорт cookies с вашего компьютера',
        'Сохраните cookies OLX в JSON-файл локально, затем в PowerShell выполните:',
        '```',
        `npm run session:connect -- ${telegramUserId} "C:\\путь\\к\\cookies.json"`,
        '```',
        'Файл читается локально; его содержимое и cookies не отправляются в Telegram.',
        'Бот хранит cookies в зашифрованном виде.',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    await ctx.answerCbQuery();
  });

  bot.action('session_account', async (ctx) => {
    const telegramUserId = Number(ctx.from.id);
    await ctx.reply(
      [
        '🌐 Подключение через аккаунт',
        'На компьютере, где доступен ваш .env и база из Docker, выполните в PowerShell:',
        '```',
        `npm run session:connect -- ${telegramUserId}`,
        '```',
        'Откроется локальный браузер. Войдите на OLX там, а затем нажмите Enter в PowerShell. Пароль вводите только на сайте OLX — бот его не получает и не сохраняет.',
        'Если браузер Playwright ещё не установлен на компьютере, сначала выполните: npx playwright install chromium',
        'При подключении через Docker локальный скрипт использует адрес базы данных из .env (localhost:5433).',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
    await ctx.answerCbQuery();
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || !/^https?:\/\//i.test(text)) {
      return;
    }

    const telegramUserId = Number(ctx.from?.id ?? 0);
    const rateLimit = checkRateLimit(`tg:${telegramUserId}`);
    if (rateLimit.limited) {
      await ctx.reply(`⏳ Слишком много запросов. Попробуйте позже. До сброса: ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)}с.`);
      return;
    }
    const username = ctx.from?.username ?? undefined;
    const firstName = ctx.from?.first_name ?? undefined;

    try {
      const task = await addListing({
        telegramUserId,
        url: text,
        username,
        firstName,
      });

      await ctx.reply(
        `✅ Задача создана\nID: ${task.id}\nURL: ${task.url}\nСтатус: ${task.status}\n\nВыполнение начнётся в фоне.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать задачу';
      logger.error({ telegramUserId, url: sanitizeForLog(text), message }, 'Failed to create listing task');
      await ctx.reply(`❌ Ошибка: ${message}`);
    }
  });

  bot.action('cancel_task', async (ctx) => {
    const taskId = String((ctx as any).callbackQuery?.data ?? '');
    await ctx.answerCbQuery();
    await ctx.reply('❌ Отмена задачи будет доступна после реализации связки с задачами.');
  });

  bot.catch((error, ctx) => {
    logger.error({ error, update: ctx.update }, 'Telegram bot error');
    void ctx.reply('⚠️ Произошла ошибка в работе бота. Проверьте логи и повторите попытку.');
  });

  return bot;
}
