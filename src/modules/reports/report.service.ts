import { TaskStatus } from '@prisma/client';

export function buildTaskSummary(task: {
  id: string;
  url: string;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  result: unknown;
  error: string | null;
}) {
  const result = (task.result ?? {}) as Record<string, unknown>;
  const likesCompleted = Number(result.likesCompleted ?? 0);
  const phoneViewsCompleted = Number(result.phoneViewsCompleted ?? 0);
  const warnings = Array.isArray(result.warnings) ? (result.warnings as string[]) : [];

  return [
    `📌 Задача: ${task.id}`,
    `🔗 Объявление: ${task.url}`,
    `📊 Статус: ${task.status}`,
    `⏰ Создана: ${new Date(task.createdAt).toLocaleString('ru-RU')}`,
    `✅ Лайки: ${likesCompleted}`,
    `📞 Показов телефона: ${phoneViewsCompleted}`,
    `⚠️ Ошибки: ${task.error ?? 'нет'}`,
    warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildStatsSummary(stats: {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}) {
  return [
    '📊 Статистика задач',
    `Всего: ${stats.total}`,
    `Завершено: ${stats.completed}`,
    `Провалено: ${stats.failed}`,
    `В ожидании: ${stats.pending}`,
  ].join('\n');
}
