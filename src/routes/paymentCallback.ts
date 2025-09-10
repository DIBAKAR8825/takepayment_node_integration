// src/routes/paymentCallback.ts
import express, { Request, Response } from "express";
import { ResponseVerifier } from "../support/ResponseVerifier";

const router = express.Router();

router.post("/api/payment/callback", (req: Request, res: Response) => {
  try {
    const response = req.body;

    if (!response || !response.responseCode) {
      return res.status(400).json({ status: "error", message: "Invalid callback payload" });
    }

    // ✅ Verify signature
    ResponseVerifier.verify(response);

    if (response.responseCode === 0) {
      console.log("💳 Payment successful:", response);
      // TODO: Update DB → mark order as PAID
    } else {
      console.log("❌ Payment failed:", response);
      // TODO: Update DB → mark order as FAILED
    }

    // ✅ Must return 200 so gateway knows we processed the callback
    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Callback error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
