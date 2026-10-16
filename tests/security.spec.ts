import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('URL validation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOT_TOKEN = 'test-bot-token-123456';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.COOKIE_ENCRYPTION_KEY = '1234567890abcdef1234567890abcdef';
    process.env.NODE_ENV = 'test';
  });

  it('accepts a valid OLX listing URL', async () => {
    const { validateOlxUrl } = await import('../src/utils/security.js');
    const result = validateOlxUrl('https://www.olx.kz/d/obyavlenie/example-ID123.html');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toContain('www.olx.kz');
  });

  it('rejects non-OLX domains', async () => {
    const { validateOlxUrl } = await import('../src/utils/security.js');
    const result = validateOlxUrl('https://example.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/not allowed|host/i);
  });
});

describe('cookie encryption', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOT_TOKEN = 'test-bot-token-123456';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.COOKIE_ENCRYPTION_KEY = '1234567890abcdef1234567890abcdef';
    process.env.NODE_ENV = 'test';
  });

  it('encrypts and decrypts cookie data', async () => {
    const { decryptSensitiveData, encryptSensitiveData } = await import('../src/utils/security.js');
    const original = 'sessionid=abc123; test=value';
    const encrypted = encryptSensitiveData(original);
    const decrypted = decryptSensitiveData(encrypted);
    expect(encrypted).not.toBe(original);
    expect(decrypted).toBe(original);
  });
});

describe('session manager', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BOT_TOKEN = 'test-bot-token-123456';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.COOKIE_ENCRYPTION_KEY = '1234567890abcdef1234567890abcdef';
    process.env.NODE_ENV = 'test';
  });

  it('parses raw cookie strings', async () => {
    const { SessionManager } = await import('../src/browser/session.manager.js');
    const cookies = SessionManager.parseCookies('sessionid=abc123; theme=dark');
    expect(cookies.length).toBe(2);
    expect(cookies[0]?.name).toBe('sessionid');
  });
});
