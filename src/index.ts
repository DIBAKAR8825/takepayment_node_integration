import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { Gateway } from "./service/Gateway";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Example REST API endpoint
app.post("/api/payment", (req: Request, res: Response) => {
  try {
    const paymentData = {
      countryCode: 826,
      currencyCode: 826,
      amount: 100,
      customerEmail: "dibakar_chakraborty@outlook.com",
      customerAddress: "Newtown, Anycounty, AN1 1AA",
      customerPostCode: "TE15 5ST",
      customerPhone: "+44 1234567111",
      orderRef: "Order ID- #675450",
      transactionUnique: "45678912345621",
    };

    const tran = {
      merchantID: process.env.MERCHANT_ID!,
      merchantSecret: process.env.MERCHANT_SECRET!,
      action: "SALE",
      type: 1,
      ...paymentData,
    };

    //  Return signed payload
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
