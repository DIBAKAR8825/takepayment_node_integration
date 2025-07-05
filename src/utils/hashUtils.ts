import * as crypto from 'crypto';

/**
 * Generate a SHA512 signature from form fields and pre-shared key
 */
export function generateSignature(fields: Record<string, any>, secret: string): string {
  const sortedKeys = Object.keys(fields).sort();
  const signatureString = sortedKeys.map(key => `${key}=${fields[key]}`).join('&');
  return crypto.createHash('sha512').update(secret + signatureString).digest('hex');
}
