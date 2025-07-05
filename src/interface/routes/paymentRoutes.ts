import { Router } from 'express';
import { initiatePayment } from '../controllers/PaymentController';

const router = Router();

// POST /api/payments/initiate
router.post('/initiate', initiatePayment);

export default router;
