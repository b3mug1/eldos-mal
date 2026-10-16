import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z
    .string()
    .min(10, 'BOT_TOKEN must be provided')
    .refine((value) => !value.includes('replace_with_telegram_bot_token'), 'BOT_TOKEN must be real and not a placeholder'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  COOKIE_ENCRYPTION_KEY: z.string().min(32, 'COOKIE_ENCRYPTION_KEY must be at least 32 chars'),
  ADMIN_USER_IDS: z.string().default(''),
  PORT: z.coerce.number().default(3000),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400),
  LOG_LEVEL: z.string().default('info'),
  ALLOWED_OLX_DOMAINS: z.string().default('olx.kz,www.olx.kz,*.olx.kz'),
  BROWSER_HEADLESS: z.coerce.boolean().default(true),
});

export const config = envSchema.parse(process.env);

export const adminUserIds = config.ADMIN_USER_IDS.split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number(value))
  .filter((value) => Number.isFinite(value));

export const allowedOlxDomains = config.ALLOWED_OLX_DOMAINS.split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
