import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { Gateway } from "./service/Gateway";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post("/api/payment", (req: Request, res: Response) => {
  try {
    const { amount, customerEmail, customerAddress, customerPostCode, customerPhone, redirectURL, callbackURL } = req.body;

    if (!amount || !customerEmail || !customerAddress || !customerPostCode || !customerPhone) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }

    const tran = {
      merchantID: process.env.MERCHANT_ID!,
      merchantSecret: process.env.MERCHANT_SECRET!,
      action: "SALE",
      type: 1,
      countryCode: 826,   // fixed value for UK
      currencyCode: 826,  // fixed value for GBP
      amount,
      customerEmail,
      customerAddress,
      customerPostCode,
      customerPhone,
      orderRef: `Order-${Date.now()}`,   // auto-generate order ref
      transactionUnique: Date.now().toString(), // simple unique ID
      redirectURL: redirectURL || process.env.REDIRECT_URL!,
      callbackURL: callbackURL || process.env.CALLBACK_URL!
    };

    const signedPayload = Gateway.prepareSignedRequest(tran);

    return res.json({
      status: "success",
      payload: signedPayload,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});