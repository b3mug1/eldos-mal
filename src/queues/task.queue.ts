import { Queue, Worker, type Job } from 'bullmq';
import { Prisma, TaskStatus, OperationType } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { redis } from './redis.js';
import { logger } from '../utils/logger.js';
import { OlxEngagementAdapter } from '../browser/olx.adapter.js';
import { SessionManager } from '../browser/session.manager.js';

export type TaskJobData = {
  taskId: string;
  telegramUserId: number;
  listingUrl: string;
  operation: 'CHECK_LISTING' | 'ENGAGEMENT';
  cookies?: string;
  sessionId?: string;
};

export type TaskJobResult = {
  success: boolean;
  message: string;
  likesCompleted: number;
  phoneViewsCompleted: number;
  warnings: string[];
};

export const taskQueue = new Queue<TaskJobData>('olx-engagement', {
  connection: redis,
});

export const taskWorker = new Worker<TaskJobData, TaskJobResult>(
  'olx-engagement',
  async (job: Job<TaskJobData, TaskJobResult>) => {
    const { taskId, listingUrl, telegramUserId, operation } = job.data;

    logger.info({ taskId, listingUrl, telegramUserId, operation }, 'Processing task');

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    let cookies: string | undefined;
    if (job.data.sessionId) {
      if (!task.userId) {
        throw new Error('The task is not linked to a user and cannot use an OLX session.');
      }
      const session = await prisma.session.findFirst({
        where: {
          id: job.data.sessionId,
          userId: task.userId,
          isActive: true,
        },
      });
      if (!session?.encryptedCookies) {
        throw new Error('The selected OLX session is unavailable or inactive.');
      }
      cookies = SessionManager.fromEncryptedStorage(session.encryptedCookies);
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.RUNNING,
        attempts: { increment: 1 },
      },
    });

    try {
      if (operation === 'ENGAGEMENT') {
        const adapter = new OlxEngagementAdapter();
        const result = await adapter.execute({
          listingUrl,
          cookies,
          likesTarget: 50,
          phoneTarget: 50,
        });

        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
            result: result as Prisma.InputJsonValue,
            error: result.success ? null : result.message,
            completedAt: new Date(),
          },
        });

        await prisma.taskEvent.create({
          data: {
            taskId,
            type: result.success ? 'completed' : 'failed',
            payload: result as Prisma.InputJsonValue,
          },
        });

        return result;
      }

      const result: TaskJobResult = {
        success: true,
        likesCompleted: 0,
        phoneViewsCompleted: 0,
        warnings: ['Проверка объявления выполнена. Для реального взаимодействия требуется отдельная сессия с cookies.'],
        message: 'Объявление проверено. Для действий может потребоваться сессия пользователя.',
      };

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          result: result as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      logger.error({ taskId, error: message }, 'Task execution failed');

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          error: message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  },
  { connection: redis },
);

export async function gracefulQueueShutdown(): Promise<void> {
  await taskQueue.close();
  await taskWorker.close();
}
