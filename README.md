##  Takepayments Node.js Integration

```markdown
# Takepayments Gateway Integration – Node.js (TypeScript)

This project is a Node.js backend implementation for integrating the [Takepayments Payment Gateway](https://www.takepayments.com) using a **Domain-Driven Design (DDD)** structure with **TypeScript** and **PostgreSQL**. It provides secure payment handling using REST APIs and can be tested with Postman.

---

## 📁 Folder Structure

```

takepayments-node-integration/
├── src/
│   ├── interface/
│   │   ├── controllers/        # Request handlers
│   │   │   └── PaymentController.ts
│   │   └── routes/             # Express routes
│   │       └── paymentRoutes.ts
│   ├── usecase/                # Business logic (optional)
│   ├── domain/                 # Types / interfaces / entities
│   ├── infra/                  # DB or external service integrations
│   ├── utils/                  # Utility functions (e.g. hash generator)
│   │   └── hashUtils.ts
│   └── server.ts               # Main entry point
├── .env                        # Environment variables
├── tsconfig.json               # TypeScript config
├── package.json
└── README.md

````

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 12
- [Takepayments Test Credentials](https://www.takepayments.com)
- `curl` or Postman for testing

---

## ⚙️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/DIBAKAR8825/takepayment_node_integration.git
cd takepayments-node-integration
````

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Environment

Create a `.env` file in the root and add the following:

```env
PORT=3000

# Takepayments Gateway Config
MERCHANT_ID=your_merchant_id
MERCHANT_SECRET=your_secret_key
GATEWAY_URL=https://your-gateway-url.com/hosted/
REDIRECT_URL=https://your-frontend.com/success
```

---

### 4. Run the Dev Server

```bash
npm run dev
```

It should say:

```
Server running on http://localhost:3000
```

---

## 🚀 API Endpoints

### Base URL

```
http://localhost:3000/api/payments
```

---

### `POST /initiate`

Initiate a new transaction and get the redirect URL to Takepayments Gateway.

#### Sample Request

```json
{
  "amount": 680,
  "orderRef": "Test Transaction",
  "currencyCode": 826,
  "countryCode": 826
}
```

#### Sample Response

```json
{
  "redirectUrl": "https://gateway-url.com/hosted?merchantID=...&signature=..."
}
```

---

### `POST /callback`

The callback route to handle the Takepayments POST response (called by the gateway).

* Will extract and validate the signature.
* Log or persist the transaction result.

---

## Test with Postman

Import the following endpoints:

* `POST /api/payments/initiate`
* `POST /api/payments/callback`

Make sure your redirect URL is accessible and matches the one set in `.env`.

---

## Build for Production

```bash
npm run build
```

Output will be saved in the `dist/` folder.

---
