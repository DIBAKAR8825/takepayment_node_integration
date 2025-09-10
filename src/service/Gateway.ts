import { RequestPreparer } from "../support/RequestPreparer";
import { SignatureHelper } from "../support/SignatureHelper";

export class Gateway {
  static hostedUrl: string = "https://gw1.tponlinepayments.com/paymentform/";
  static directUrl: string = "https://gw1.tponlinepayments.com/direct/";
  static merchantID: string | null = null;
  static merchantSecret: string | null = null;
  static debug: boolean = true;

  static prepareSignedRequest(
    request: Record<string, any>,
    options?: Record<string, any>
  ): Record<string, any> {
    const { secret } = RequestPreparer.prepare(request, options ?? null);

    if (secret) {
      request.signature = SignatureHelper.sign(request, secret, true);
    }

    return request;
  }
}
