import { OperationType, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { validateOlxUrl } from '../../utils/security.js';
import { taskQueue } from '../../queues/task.queue.js';

export async function getTasksByTelegramUser(telegramUserId: number) {
  return prisma.task.findMany({
    where: { telegramUserId: BigInt(telegramUserId) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function getTaskStats(telegramUserId: number) {
  const [total, completed, failed, pending] = await Promise.all([
    prisma.task.count({ where: { telegramUserId: BigInt(telegramUserId) } }),
    prisma.task.count({ where: { telegramUserId: BigInt(telegramUserId), status: TaskStatus.COMPLETED } }),
    prisma.task.count({ where: { telegramUserId: BigInt(telegramUserId), status: TaskStatus.FAILED } }),
    prisma.task.count({ where: { telegramUserId: BigInt(telegramUserId), status: TaskStatus.PENDING } }),
  ]);

  return { total, completed, failed, pending };
}

export async function createTaskForUser({
  telegramUserId,
  url,
  operation,
  userId,
  sessionId,
}: {
  telegramUserId: number;
  url: string;
  operation: OperationType;
  userId?: string;
  sessionId?: string;
}) {
  const validation = validateOlxUrl(url);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'URL validation failed');
  }

  const existing = await prisma.task.findFirst({
    where: {
      telegramUserId: BigInt(telegramUserId),
      url: validation.normalizedUrl,
      status: { in: [TaskStatus.PENDING, TaskStatus.RUNNING] },
    },
  });

  if (existing) {
    return existing;
  }

  const task = await prisma.task.create({
    data: {
      telegramUserId: BigInt(telegramUserId),
      userId,
      url: validation.normalizedUrl!,
      operation,
      sessionId,
      status: TaskStatus.PENDING,
      result: { message: 'Задача создана и ожидает обработки.' } as Prisma.InputJsonValue,
    },
  });

  await taskQueue.add('olx-engagement', {
    taskId: task.id,
    telegramUserId,
    listingUrl: validation.normalizedUrl!,
    operation: operation === OperationType.ENGAGEMENT ? 'ENGAGEMENT' : 'CHECK_LISTING',
    sessionId,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });

  return task;
}

export async function cancelTask(taskId: string, telegramUserId: number) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, telegramUserId: BigInt(telegramUserId) },
  });

  if (!task) {
    return null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.CANCELLED,
      completedAt: new Date(),
      error: 'Отменено пользователем.',
    },
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}
