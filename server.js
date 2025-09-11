// server.js
import fs from "fs";
const accessLogStream = fs.createWriteStream("./access.log", { flags: "a" });
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import crypto from "crypto";
import qs from "qs";
import { insertPayment, upsertCallback, listCallbacks } from "./db.js";

const app = express();
app.use(morgan("combined", { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const {
  PORT = 3000,
  TP_MERCHANT_ID,
  TP_SIGNATURE_KEY,
  TP_REDIRECT_URL,
  TP_CALLBACK_URL
} = process.env;

/* -------------------------- Signature helpers ----------------------------- */
// RFC-1738 encode + sort + CR/LF normalization
function encodeForSignature(obj, fieldNames = null) {
  // choose which fields to sign (if provided), else use all except 'signature'
  const entries = Object.entries(obj).filter(
    ([k, v]) => k !== "signature" && v !== undefined && v !== null
  );

  const subset = fieldNames
    ? entries.filter(([k]) => fieldNames.includes(k))
    : entries;

  // sort by field name (ASCII)
  const sorted = subset
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  let encoded = qs.stringify(sorted, { encode: true, format: "RFC1738", arrayFormat: "indices" });

  // normalize CR/LF variants to a single LF (%0A)
  encoded = encoded
    .replace(/%0D%0A/gi, "%0A")
    .replace(/%0A%0D/gi, "%0A")
    .replace(/%0D/gi, "%0A");

  return { encoded, signedFieldNames: Object.keys(sorted) };
}

function makeSignatureHex(obj, fieldNames = null) {
  const { encoded } = encodeForSignature(obj, fieldNames);
  return crypto.createHash("sha512").update(encoded + TP_SIGNATURE_KEY, "utf8").digest("hex");
}

// for our “create” API: attach list after a pipe (helps debugging)
function makeSignatureWithList(obj) {
  const { signedFieldNames } = encodeForSignature(obj, null);
  const hex = makeSignatureHex(obj, null);
  return `${hex}|${signedFieldNames.join(",")}`;
}

// verify callback signature:
// - supports "hex|f1,f2,...,fn" (we'll use that list), OR
// - plain "hex" (we'll sign all fields except 'signature')
function verifySignatureFromIncoming(obj) {
  const sig = obj.signature;
  if (!sig || typeof sig !== "string") return false;

  const [hexProvided, list] = sig.split("|");
  const fields = list ? list.split(",").map(s => s.trim()).filter(Boolean) : null;

  try {
    const hexExpected = makeSignatureHex(obj, fields);
    // timing-safe compare
    return crypto.timingSafeEqual(Buffer.from(hexProvided, "hex"), Buffer.from(hexExpected, "hex"));
  } catch {
    return false;
  }
}

/* ---------------------------- REST endpoints ------------------------------ */

// Create payment payload
// Request body:
// {
//   "amount": 100,
//   "customerEmail": "...",
//   "customerAddress": "...",
//   "customerPostCode": "...",
//   "customerPhone": "+44 ..."
// }
app.post("/api/payment", async (req, res) => {
  const {
    amount,
    customerEmail,
    customerAddress,
    customerPostCode,
    customerPhone
  } = req.body || {};

  if (
    typeof amount !== "number" ||
    !customerEmail ||
    !customerAddress ||
    !customerPostCode ||
    !customerPhone
  ) {
    return res.status(400).json({
      status: "error",
      message:
        "Invalid request. Required: amount (number), customerEmail, customerAddress, customerPostCode, customerPhone."
    });
  }

  const ts = Date.now();
  const orderRef = `Order-${ts}`;
  const transactionUnique = String(ts);

  const payload = {
    merchantID: TP_MERCHANT_ID,
    action: "SALE",
    type: 1,
    countryCode: 826,
    currencyCode: 826,
    amount: amount,
    customerEmail,
    customerAddress,
    customerPostCode,
    customerPhone,
    orderRef,
    transactionUnique,
    redirectURL: TP_REDIRECT_URL,
    callbackURL: TP_CALLBACK_URL
  };

  const signature = makeSignatureWithList(payload);

  // persist the “intent” we generated
  await insertPayment({
    orderRef,
    transactionUnique,
    amount,
    customerEmail,
    customerAddress,
    customerPostCode,
    customerPhone,
    payload_json: JSON.stringify({ ...payload, signature }),
    created_at: new Date().toISOString()
  });

  return res.json({
    status: "success",
    payload: {
      ...payload,
      signature
    }
  });
});

// Browser redirect (optional, just for visibility)
app.all("/api/payment/redirect", (req, res) => {
  const fields = req.method === "POST" ? req.body : req.query;
  res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Payment Redirect</title></head>
<body>
  <h1>Return from Payment</h1>
  <pre>${escapeHTML(JSON.stringify(fields, null, 2))}</pre>
  <p>(Use <code>/callbacks</code> to view server-to-server notifications.)</p>
</body></html>`);
});

// Server-to-server callback: verify + persist (IDEMPOTENT)
app.post("/payment/callback", async (req, res) => {
  const body = req.body || {};

  // Log incoming headers and body for debugging
  console.log("[CALLBACK] headers=", req.headers); 
  console.log("[CALLBACK] body=", body); 

  // Create the reference key for storing data
  const ref = body.xref || body.crossReference || body.transactionUnique || "unknown";

  // Log reference value for debugging
  console.log("[CALLBACK] ref:", ref);

  // Verify the signature
  const valid = verifySignatureFromIncoming(body);
  console.log("[CALLBACK] signature valid:", valid);

  // Extract the response code and message
  const responseCode = body.responseCode ?? body.statusCode ?? null;
  const responseMessage = body.responseMessage ?? body.message ?? null;

  // Log extracted values before inserting into DB
  console.log("[CALLBACK] responseCode:", responseCode);
  console.log("[CALLBACK] responseMessage:", responseMessage);

  // Store the callback data in the database
  await upsertCallback({
    ref,
    signature_valid: valid ? 1 : 0,
    response_code: responseCode,
    response_message: responseMessage,
    body_json: JSON.stringify(body),  // Store the full callback body as JSON
    received_at: new Date().toISOString()
  });

  // Respond with 200 OK to acknowledge receipt
  res.status(200).send("OK");
});

// Inspect captured callbacks (for testing)
app.get("/callbacks", async (_req, res) => {
  const rows = await listCallbacks(100);
  res.json({ count: rows.length, items: rows });
});

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`REST API listening on http://localhost:${PORT}`);
});

/* --------------------------------- Utils ---------------------------------- */
function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
