import { OperationType } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { ensureUser } from '../users/user.service.js';
import { createTaskForUser } from '../tasks/task.service.js';
import { validateOlxUrl } from '../../utils/security.js';

export async function addListing({
  telegramUserId,
  url,
  username,
  firstName,
}: {
  telegramUserId: number;
  url: string;
  username?: string;
  firstName?: string;
}) {
  const validation = validateOlxUrl(url);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid OLX URL');
  }

  const user = await ensureUser(telegramUserId, username, firstName, 'USER');
  const session = await prisma.session.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  return createTaskForUser({
    telegramUserId,
    url: validation.normalizedUrl!,
    operation: OperationType.ENGAGEMENT,
    userId: user.id,
    sessionId: session?.id,
  });
}

export async function checkListing({
  telegramUserId,
  url,
  username,
  firstName,
}: {
  telegramUserId: number;
  url: string;
  username?: string;
  firstName?: string;
}) {
  const validation = validateOlxUrl(url);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid OLX URL');
  }

  const user = await ensureUser(telegramUserId, username, firstName, 'USER');

  return createTaskForUser({
    telegramUserId,
    url: validation.normalizedUrl!,
    operation: OperationType.CHECK_LISTING,
    userId: user.id,
  });
}
