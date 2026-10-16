import { type Context, type Middleware } from 'telegraf';
import { isAdminUser } from '../../utils/security.js';
import { getUserByTelegramId } from '../../modules/users/user.service.js';

export const requireTelegramUser: Middleware<Context> = async (ctx, next) => {
  const telegramUser = ctx.from;
  if (!telegramUser) {
    await ctx.reply('❌ Не удалось определить вашего Telegram пользователя.');
    return;
  }

  ctx.state.telegramUser = telegramUser;
  await next();
};

export const requireAdmin: Middleware<Context> = async (ctx, next) => {
  const telegramUser = ctx.from;
  if (!telegramUser || !isAdminUser(Number(telegramUser.id))) {
    await ctx.reply('🚫 У вас нет прав администратора для этого действия.');
    return;
  }

  await next();
};

export const ensureUserRecord: Middleware<Context> = async (ctx, next) => {
  const telegramUser = ctx.from;
  if (!telegramUser) {
    return;
  }

  const current = await getUserByTelegramId(Number(telegramUser.id));
  if (!current) {
    await import('../../modules/users/user.service.js').then(({ ensureUser }) =>
      ensureUser(Number(telegramUser.id), telegramUser.username ?? undefined, telegramUser.first_name ?? undefined, 'USER'),
    );
  }

  await next();
};
