import * as RedisModule from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const RedisCtor = (RedisModule as any).default ?? RedisModule;

export const redis = new RedisCtor(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (error: unknown) => {
  logger.error({ error }, 'Redis connection error');
});
