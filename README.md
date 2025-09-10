curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "customerEmail": "dibakar_chakraborty@outlook.com",
    "customerAddress": "Newtown, Anycounty, AN1 1AA",
    "customerPostCode": "TE15 5ST",
    "customerPhone": "+44 1234567111",
    "redirectURL": "http://localhost:3000/payment/success",
    "callbackURL": "http://localhost:3000/payment/callback"
  }'
