import { Router, Request, Response, NextFunction } from 'express';
import { authenticateUser } from '../middleware/authMiddleware';
import { campaignCreationLimiter } from '../middleware/rateLimit';
import campaignController from '../controllers/campaignController';

const router = Router();

// Apply authentication to all campaign routes
router.use(authenticateUser);

// Helper function to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// POST /api/campaigns - Create campaign (with rate limiting)
router.post(
  '/',
  campaignCreationLimiter,
  asyncHandler(async (req, res) => {
    await campaignController.createCampaign(req, res);
  })
);

// GET /api/campaigns/:id - Get campaign status
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await campaignController.getCampaignStatus(req, res);
  })
);

// GET /api/campaigns - List user's campaigns
router.get(
  '/',
  asyncHandler(async (req, res) => {
    await campaignController.listCampaigns(req, res);
  })
);

export default router;
