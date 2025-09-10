import { Gateway } from "../service/Gateway";

export class RequestPreparer {
  static prepare(
    request: Record<string, any>,
    options: Record<string, any> | null
  ): { secret: string | null; directUrl: string; hostedUrl: string } {
    if (!request) {
      throw new Error("Request must be provided.");
    }

    if (!request.action) {
      throw new Error("Request must contain an 'action'.");
    }

    // Fill defaults
    if (!request.merchantID && Gateway.merchantID) {
      request.merchantID = Gateway.merchantID;
    }

    if (!request.merchantPwd && (Gateway as any).merchantPwd) {
      request.merchantPwd = (Gateway as any).merchantPwd;
    }

    if (!request.merchantID) {
      throw new Error("Merchant ID or Alias must be provided.");
    }

    const secret = request.merchantSecret ?? Gateway.merchantSecret;
    delete request.merchantSecret;

    const hostedUrl = request.hostedUrl ?? Gateway.hostedUrl;
    delete request.hostedUrl;

    const directUrl = request.directUrl ?? Gateway.directUrl;
    delete request.directUrl;

    // Clean unwanted fields
    ["responseCode", "responseMessage", "responseStatus", "state", "signature", "merchantAlias", "merchantID2"]
      .forEach(f => delete request[f]);

    return { secret, directUrl, hostedUrl };
  }
}
