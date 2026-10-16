import { createBot } from './bot/bot.js';
import { prisma } from './database/prisma.js';
import { logger } from './utils/logger.js';
import { config } from './config/env.js';
import { gracefulQueueShutdown, taskWorker } from './queues/task.queue.js';

async function main() {
  if (config.BOT_TOKEN.includes('replace_with_telegram_bot_token')) {
    throw new Error('BOT_TOKEN is not configured. Set a valid token in .env before launching the bot.');
  }

  await prisma.$connect();

  const bot = createBot();
  await bot.launch();

  logger.info(`Telegram bot started on port ${config.PORT}`);

  process.on('SIGINT', async () => {
    logger.info('Graceful shutdown requested');
    await bot.stop('SIGINT');
    await gracefulQueueShutdown();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Graceful shutdown requested');
    await bot.stop('SIGTERM');
    await gracefulQueueShutdown();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error({ error }, 'Fatal app error');
  process.exit(1);
});
