import { Request, Response } from 'express';
import { initiateHostedPayment } from '../../application/usecases/initiatePaymentUsecase';

/**
 * Controller: Handles the POST /initiate API
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const { amount, orderRef, redirectURL } = req.body;

  try {
    const htmlForm = await initiateHostedPayment({ amount, orderRef, redirectURL });
    res.send(htmlForm); // Returns the HTML form that auto-submits to Takepayments
  } catch (error: any) {
    res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
};
