import { z } from 'zod';
import { decryptSensitiveData, encryptSensitiveData } from '../utils/security.js';

const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().default('/'),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

export type CookieRecord = z.infer<typeof cookieSchema>;

export class SessionManager {
  static toEncryptedStorage(rawCookies: string): string {
    return encryptSensitiveData(rawCookies);
  }

  static fromEncryptedStorage(encryptedCookies: string): string {
    return decryptSensitiveData(encryptedCookies);
  }

  static parseCookies(rawCookies: string): CookieRecord[] {
    if (!rawCookies) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawCookies) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((item) => cookieSchema.parse(item));
      }
    } catch {
      // Fallback to raw cookie string parsing.
    }

    return rawCookies
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...rest] = pair.split('=');
        const value = rest.join('=');
        return cookieSchema.parse({ name, value, path: '/', domain: 'www.olx.kz' });
      });
  }
}
