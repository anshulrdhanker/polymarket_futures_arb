import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { SubscriptionService, PRICING_TIERS } from '../services/subscriptionService';
import { authenticateUser } from '../middleware/authMiddleware';

const router = express.Router();

// Use the existing user type from your auth middleware
interface AuthenticatedRequest extends Request {
  user?: any; // This matches your existing (req as any).user pattern
}

// Simple validation function to replace express-validator
const validateCheckoutRequest: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const { campaignPackage, successUrl, cancelUrl } = req.body;
  const errors: string[] = [];

  if (!campaignPackage || typeof campaignPackage !== 'string') {
    errors.push('Campaign package is required and must be a string');
  }

  if (!successUrl || typeof successUrl !== 'string' || !isValidUrl(successUrl)) {
    errors.push('Valid success URL is required');
  }

  if (!cancelUrl || typeof cancelUrl !== 'string' || !isValidUrl(cancelUrl)) {
    errors.push('Valid cancel URL is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
};

// Simple URL validation helper
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Simple rate limiting using in-memory store
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const simpleRateLimit = (maxRequests: number, windowMs: number): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};

// Rate limiter for checkout endpoint
const checkoutLimiter = simpleRateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes

// Async handler to avoid repetitive try-catch
const asyncHandler = (fn: Function): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply auth to all subscription routes
router.use(authenticateUser as RequestHandler);

/**
 * GET /api/subscription/status
 * Get the current user's subscription status and campaign balance
 */
router.get('/status', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized - User ID not found' 
    });
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
}));

/**
 * POST /api/subscription/checkout
 * Create a Stripe checkout session for purchasing campaigns
 */
router.post('/checkout', checkoutLimiter);
router.post('/checkout', validateCheckoutRequest);
router.post('/checkout', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { campaignPackage, successUrl, cancelUrl } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized - User ID not found' 
    });
  }

  // Validate campaign package exists
  if (!PRICING_TIERS[campaignPackage as keyof typeof PRICING_TIERS]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid campaign package selected'
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
}));

/**
 * GET /api/subscription/plans
 * Get available pricing plans
 */
router.get('/plans', asyncHandler(async (req: Request, res: Response) => {
  // Format the pricing tiers for the frontend
  const plans = Object.entries(PRICING_TIERS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    campaigns: plan.campaigns,
    pricePerCampaign: parseFloat((plan.price / plan.campaigns).toFixed(2)),
    stripeId: plan.stripe_price_id
  }));

  res.json({
    success: true,
    data: plans
  });
}));

/**
 * Error handler for this router
 */
const errorHandler: ErrorRequestHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Subscription route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
    return;
  }
  
  if (error.name === 'StripeError') {
    res.status(402).json({
      success: false,
      error: 'Payment processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

router.use(errorHandler);

export default router;