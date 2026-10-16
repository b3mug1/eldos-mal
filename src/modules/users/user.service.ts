import { prisma } from '../../database/prisma.js';
import type { Role } from '@prisma/client';

export async function ensureUser(telegramUserId: number, username?: string, firstName?: string, role: Role = 'USER') {
  const normalizedId = BigInt(telegramUserId);

  return prisma.user.upsert({
    where: { telegramId: normalizedId },
    update: {
      username: username ?? undefined,
      firstName: firstName ?? undefined,
      role,
    },
    create: {
      telegramId: normalizedId,
      username: username ?? null,
      firstName: firstName ?? null,
      role,
    },
  });
}

export async function getUserByTelegramId(telegramUserId: number) {
  return prisma.user.findUnique({
    where: { telegramId: BigInt(telegramUserId) },
  });
}
