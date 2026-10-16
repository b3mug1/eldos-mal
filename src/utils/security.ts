import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encryptSensitiveData(value: string): string {
  const key = Buffer.from(config.COOKIE_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSensitiveData(value: string): string {
  const key = Buffer.from(config.COOKIE_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const buffer = Buffer.from(value, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function validateOlxUrl(input: string): { valid: boolean; normalizedUrl?: string; reason?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'URL is required.' };
  }

  const trimmed = input.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, reason: 'Only http/https URLs are allowed.' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, reason: 'Unsupported protocol.' };
  }

  const hostname = url.hostname.toLowerCase();
  const allowed = config.ALLOWED_OLX_DOMAINS.split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^\*\./, ''))
    .filter(Boolean);

  const isAllowed = allowed.some((domain) => {
    if (domain === 'olx.kz' || domain === 'www.olx.kz') {
      return hostname === 'olx.kz' || hostname === 'www.olx.kz' || hostname.endsWith('.olx.kz');
    }
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });

  if (!isAllowed) {
    return { valid: false, reason: 'URL host is not allowed by SSRF policy.' };
  }

  if (['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.local')) {
    return { valid: false, reason: 'Local network hosts are blocked.' };
  }

  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (port !== 80 && port !== 443) {
    return { valid: false, reason: 'Only standard OLX ports are allowed.' };
  }

  return {
    valid: true,
    normalizedUrl: url.toString(),
  };
}

export function isAdminUser(userId: number): boolean {
  return config.ADMIN_USER_IDS.split(',').filter(Boolean).includes(String(userId));
}

export function sanitizeForLog(value: string): string {
  return value
    .replace(/(BOT_TOKEN=)([^\s]+)/gi, '$1[REDACTED]')
    .replace(/(Authorization:\s*Bearer\s+)([A-Za-z0-9._-]+)/gi, '$1[REDACTED]')
    .replace(/(cookie\s*[:=]\s*)([^;\s]+)/gi, '$1[REDACTED]')
    .replace(/(token\s*[:=]\s*)([^\s]+)/gi, '$1[REDACTED]');
}
