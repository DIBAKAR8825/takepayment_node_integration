// src/server.ts

import express from 'express';
import * as dotenv from 'dotenv';
import paymentRoutes from './interface/routes/paymentRoutes';

dotenv.config(); // Load environment variables

// Initialize express app
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true })); // To handle x-www-form-urlencoded
app.use(express.json()); // To handle application/json

// Routes
app.use('/api/payments', paymentRoutes);

// Optional: health check
app.get('/health', (_, res) => {
  res.status(200).send('API is healthy');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
