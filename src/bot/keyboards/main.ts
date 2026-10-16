import { Markup } from 'telegraf';

export const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📦 Добавить объявление', 'add_listing')],
  [Markup.button.callback('🔍 Проверить объявление', 'check_listing')],
  [Markup.button.callback('📊 Статистика', 'stats')],
  [Markup.button.callback('📋 Мои задания', 'my_tasks')],
  [Markup.button.callback('🔐 Мои сессии', 'sessions')],
  [Markup.button.callback('⚙️ Настройки', 'settings')],
]);

export const confirmationKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Подтвердить', 'confirm_task')],
  [Markup.button.callback('❌ Отмена', 'cancel_task')],
]);
