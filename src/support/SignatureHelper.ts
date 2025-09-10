import crypto from 'crypto';

// PHP-compatible url encoding
function phpUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')   // spaces → +
    .replace(/%7E/g, '~');  // keep tilde unencoded
}

export class SignatureHelper {
  static sign(
    data: Record<string, any>,
    secret: string,
    partial: boolean | string | string[] = false
  ): string {
    let dataToSign: Record<string, any> = { ...data };

    // Handle partial signing
    let partialKeys: string[] | null = null;
    if (typeof partial === 'string') {
      partialKeys = partial.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(partial)) {
      partialKeys = partial;
    }

    if (partialKeys) {
      dataToSign = Object.fromEntries(
        Object.entries(dataToSign).filter(([k]) => partialKeys!.includes(k))
      );
    }

    // Sort keys
    const keys = Object.keys(dataToSign).sort();

    // Build query string like PHP http_build_query
    let qs = keys
      .map(k => `${phpUrlEncode(k)}=${phpUrlEncode(String(dataToSign[k]))}`)
      .join('&');

    // Normalize CRLF
    qs = qs.replace(/\r\n|\n\r|\r/g, '%0A');

    const hash = crypto
      .createHash('sha512')
      .update(qs + secret, 'utf8')
      .digest('hex');

    let ret = hash;
    if (partial) {
      const usedKeys = keys.join(',');
      ret += '|' + usedKeys;
    }
    return ret;
  }
}
