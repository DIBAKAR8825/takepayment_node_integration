// src/routes/paymentRedirect.ts
import express, { Request, Response } from "express";
import { ResponseVerifier } from "../support/ResponseVerifier";

const router = express.Router();

// Support both GET and POST for redirect
router.all("/api/payment/redirect", (req: Request, res: Response) => {
  try {
    // Merge query + body for safety
    const payload: Record<string, any> = {
      ...req.query,
      ...(req.body || {}),
    };

    ResponseVerifier.verify(payload);

    const code = Number(payload.responseCode);

    if (code === 0) {
      return res.send("<h1 style='color:green'>✅ Payment Success</h1>");
    } else {
      return res.send(
        `<h1 style='color:red'>❌ Payment Failed</h1><p>${payload.responseMessage || "Unknown error"}</p>`
      );
    }
  } catch (err: any) {
    console.error("Redirect verify error:", err.message);
    return res.status(400).send(
      `<h1 style='color:orange'>⚠️ Payment Verification Failed</h1><p>${err.message}</p>`
    );
  }
});

export default router;
