import { Markup } from 'telegraf';

export const sessionsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🍪 Импортировать cookies-файл', 'session_cookies')],
  [Markup.button.callback('🌐 Войти через локальный браузер', 'session_account')],
]);
