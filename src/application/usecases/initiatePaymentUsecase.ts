import * as crypto from 'crypto';
import { generateSignature } from '../../utils/hashUtils';

interface InitiatePaymentParams {
  amount: number;
  orderRef: string;
  redirectURL: string;
}

export const initiateHostedPayment = async ({ amount, orderRef, redirectURL }: InitiatePaymentParams) => {
  const merchantID = process.env.MERCHANT_ID!;
  const preSharedKey = process.env.MERCHANT_SECRET!;
  const action = 'SALE';
  const type = 1;
  const currencyCode = 826;
  const countryCode = 826;
  const transactionUnique = crypto.randomUUID();

  const formFields = {
    merchantID,
    action,
    type,
    currencyCode,
    countryCode,
    amount,
    transactionUnique,
    orderRef,
    redirectURL
  };

  // Generate SHA-512 signature for security
  const signature = generateSignature(formFields, preSharedKey);

  const formInputs = Object.entries({ ...formFields, signature })
    .map(([key, val]) => `<input type="hidden" name="${key}" value="${val}" />`)
    .join('\n');

  const formHTML = `
    <html>
      <body onload="document.forms[0].submit()">
        <form action="${process.env.GATEWAY_URL}" method="POST">
          ${formInputs}
        </form>
      </body>
    </html>
  `;

  return formHTML;
};
