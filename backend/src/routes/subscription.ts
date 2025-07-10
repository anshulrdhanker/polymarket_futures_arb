import express, { Request, Response } from 'express';
import { SubscriptionService, PRICING_TIERS } from '../services/subscriptionService';
import { authenticateUser } from '../middleware/authMiddleware';

const router = express.Router();

// Apply auth to all subscription routes
router.use(authenticateUser);

/**
 * GET /api/subscription/status
 * Get the current user's subscription status and campaign balance
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await SubscriptionService.getUserSubscriptionStatus(userId);
    res.json({
      success: true,
      data: {
        campaignsPurchased: status.campaignsPurchased,
        campaignsUsed: status.campaignsUsed,
        campaignsRemaining: status.campaignsRemaining,
        isEnterprise: status.isEnterprise,
        lastPurchaseDate: status.lastPurchaseDate
      }
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/subscription/checkout
 * Create a Stripe checkout session for purchasing campaigns
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { campaignPackage, successUrl, cancelUrl } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!campaignPackage || !successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: campaignPackage, successUrl, cancelUrl'
      });
    }

    const sessionUrl = await SubscriptionService.createCheckoutSession(
      userId,
      campaignPackage,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: { url: sessionUrl }
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/subscription/plans
 * Get available pricing plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    // Format the pricing tiers for the frontend
    const plans = Object.entries(PRICING_TIERS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      campaigns: plan.campaigns,
      pricePerCampaign: (plan.price / plan.campaigns).toFixed(2)
    }));

    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('Error getting pricing plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing plans',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
