import express from 'express';
import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig) {
    console.error('Missing Stripe signature');
    res.status(400).json({ error: 'Missing Stripe signature' });
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await SubscriptionService.handleStripeWebhook({
      id: event.id,
      type: event.type,
      data: { object: event.data.object }
    });
    
    res.json({ received: true });
    return;
  } catch (err: any) {
    if (err.type === 'StripeSignatureVerificationError') {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
    } else {
      console.error('Error processing webhook:', err);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        details: err.message 
      });
    }
    return;
  }
});

export default router;
