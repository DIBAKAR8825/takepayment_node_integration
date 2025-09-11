import "dotenv/config";
import express from "express";
import morgan from "morgan";
import crypto from "crypto";
import qs from "qs";

const app = express();
app.use(morgan("tiny"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const {
  PORT = 3000,
  TP_MERCHANT_ID,
  TP_SIGNATURE_KEY,
  TP_REDIRECT_URL,
  TP_CALLBACK_URL
} = process.env;

// In-memory store for callbacks (for demo/inspection)
const callbacks = [];

// Helpers
function rfc1738EncodeSorted(data) {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k, v]) => k !== "signature" && v !== undefined && v !== null)
  );
  const sorted = Object.keys(filtered).sort().reduce((acc, k) => {
    acc[k] = filtered[k];
    return acc;
  }, {});
  let encoded = qs.stringify(sorted, { encode: true, format: "RFC1738", arrayFormat: "indices" });
  // Normalize CR/LF variants to a single LF (%0A)
  encoded = encoded
    .replace(/%0D%0A/gi, "%0A")
    .replace(/%0A%0D/gi, "%0A")
    .replace(/%0D/gi, "%0A");
  return { encoded, signedFieldNames: Object.keys(sorted) };
}

function generateSignature(payload) {
  const { encoded, signedFieldNames } = rfc1738EncodeSorted(payload);
  const hex = crypto.createHash("sha512").update(encoded + TP_SIGNATURE_KEY, "utf8").digest("hex");
  // Append the comma-separated list of fields as requested
  return `${hex}|${signedFieldNames.join(",")}`;
}

// === API: Create payment payload ===
// Request body:
// {
//   "amount": 100,
//   "customerEmail": "...",
//   "customerAddress": "...",
//   "customerPostCode": "...",
//   "customerPhone": "+44 ..."
// }
app.post("/api/payment", (req, res) => {
  const {
    amount,
    customerEmail,
    customerAddress,
    customerPostCode,
    customerPhone
  } = req.body || {};

  // Basic input validation
  if (
    typeof amount !== "number" ||
    !customerEmail ||
    !customerAddress ||
    !customerPostCode ||
    !customerPhone
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid request. Required: amount (number), customerEmail, customerAddress, customerPostCode, customerPhone."
    });
  }

  // Generate order/id fields
  const ts = Date.now();
  const orderRef = `Order-${ts}`;
  const transactionUnique = String(ts);

  // Build the gateway payload
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

  // Sign it
  const signature = generateSignature(payload);

  // Return JSON exactly in your requested shape
  return res.json({
    status: "success",
    payload: {
      ...payload,
      signature
    }
  });
});

// === Optional: simple redirect landing (browser) ===
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

// === Callback receiver (server-to-server) ===
app.post("/payment/callback", (req, res) => {
  // Capture raw body fields
  const incoming = { ...req.body, _receivedAt: new Date().toISOString() };
  callbacks.unshift(incoming);
  // Acknowledge quickly
  res.status(200).send("OK");
});

// === Inspect captured callbacks (for testing) ===
app.get("/callbacks", (_req, res) => {
  res.json({
    count: callbacks.length,
    items: callbacks.slice(0, 50)
  });
});

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`REST API listening on http://localhost:${PORT}`);
});

// Utility
function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
