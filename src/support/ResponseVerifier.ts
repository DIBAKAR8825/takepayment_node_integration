import { Gateway } from '../service/Gateway';
import { SignatureHelper } from './SignatureHelper';

export class ResponseVerifier {
  static verify(response: Record<string, any>, secret?: string | null): boolean {
    if (!response || typeof response.responseCode === 'undefined') {
      throw new Error('Invalid response from Payment Gateway');
    }

    secret = secret ?? Gateway.merchantSecret;

    let fields: string | null = null;
    let signature: string | null = null;

    if (response.signature) {
      signature = String(response.signature);
      delete response.signature;
      if (secret && signature && signature.indexOf('|') !== -1) {
        const parts = signature.split('|');
        signature = parts[0];
        fields = parts.slice(1).join('|');
      }
    }

    if (!secret && signature) {
      throw new Error('Incorrectly signed response from Payment Gateway (1)');
    } else if (secret && !signature) {
      throw new Error('Incorrectly signed response from Payment Gateway (2)');
    } else if (secret && signature) {
      const signed = SignatureHelper.sign(response, secret, fields ?? true);
      if (signed.split('|')[0] !== signature) {
        throw new Error('Incorrectly signed response from Payment Gateway');
      }
    }

    response.responseCode = Number(response.responseCode);
    return true;
  }
}
