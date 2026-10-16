import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});

export function redactSecrets(input: string): string {
  if (!input) {
    return input;
  }

  return input
    .replace(/(BOT_TOKEN=)([^\s]+)/gi, '$1[REDACTED]')
    .replace(/(Authorization:\s*Bearer\s+)([A-Za-z0-9._-]+)/gi, '$1[REDACTED]')
    .replace(/(cookie\s*[:=]\s*)([^;\s]+)/gi, '$1[REDACTED]')
    .replace(/(token\s*[:=]\s*)([^\s]+)/gi, '$1[REDACTED]');
}
