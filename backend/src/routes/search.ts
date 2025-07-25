import express, { Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { OpenAIService } from '../services/openaiService';
import { PDLService } from '../services/pdlService';
import { Campaign } from '../models/Campaign';
import { User } from '../models/User';
import { authenticateUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { QueueService } from '../services/queueService';

// Helper to properly type async request handlers
const asyncHandler = <P, ResBody = any, ReqBody = any, ReqQuery = any>(
  fn: (req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<any>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const router = express.Router();

// Rate limiting for search endpoint
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

interface SearchRequest {
  toField: string;
  bodyField?: string;
  outreachType: 'recruiting' | 'sales';
}

// POST /api/search/prospects
router.post('/prospects', searchLimiter, /* authenticateUser, */ asyncHandler<{}, any, SearchRequest>(async (req, res) => {
  console.log('🔥 [API] Search request received:', req.body);
  
  try {
    const { toField, bodyField, outreachType } = req.body;

    // Validate required fields
    if (!toField || !outreachType) {
      return res.status(400).json({
        error: 'Missing required fields: toField and outreachType are required'
      });
    }

    if (!['recruiting', 'sales'].includes(outreachType)) {
      return res.status(400).json({
        error: 'outreachType must be either "recruiting" or "sales"'
      });
    }

    // TESTING: Comment out auth check and use mock user
    // if (!req.user) {
    //   return res.status(401).json({
    //     error: 'UNAUTHORIZED',
    //     message: 'User not authenticated'
    //   });
    // }

    // TESTING: Mock user instead of req.user
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Using a valid UUID v4
      name: 'Test User',
      email: 'test@example.com'
    };

    console.log('Processing search request:', { 
      userId: mockUser.id,
      toField, 
      outreachType 
    });

    // Parse natural language input to structured data
    const conversationData = await OpenAIService.parseNaturalLanguageToConversationData(
      toField,
      outreachType
    );

    // Use mock user defaults for testing
    const userDefaults = {
      recruiter_name: mockUser.name,
      recruiter_company: 'Test Company',
      recruiter_title: 'Recruiter',
      recruiter_mission: 'Finding great candidates'
    };

    // Create a new campaign for this search
    const campaign = await Campaign.create({
      // Required fields
      user_id: mockUser.id, // Use mock user
      name: `Search: ${toField.substring(0, 50)}`,
      outreach_type: outreachType,
      user_name: userDefaults.recruiter_name,
      user_company: userDefaults.recruiter_company,
      user_title: userDefaults.recruiter_title,
      user_mission: userDefaults.recruiter_mission,
      industry: conversationData.industry || 'Technology',
      is_remote: conversationData.location?.toLowerCase().includes('remote') ? 'remote' : 'on-site',
      
      // Search criteria and conversation data
      search_criteria: {
        original_query: toField,
        bodyField,
        outreachType,
        timestamp: new Date().toISOString()
      },
      conversation_data: {
        ...conversationData,
        parsed_at: new Date().toISOString(),
        confidence_score: 1.0 // Assuming high confidence for now
      }
    });

    if (!campaign) {
      return res.status(500).json({
        error: 'CAMPAIGN_CREATION_FAILED',
        message: 'Failed to create campaign'
      });
      
    }

    try {
      console.log('🔥 [API] Campaign created, queuing job...');
      // Start campaign processing using correct method name
      await QueueService.startCampaignProcessing(campaign.id, mockUser.id, conversationData);

      // Return immediate response with campaign ID for polling
      const campaignData = {
        campaignId: campaign.id,
        status: 'processing',
        message: 'Search is being processed. Poll /api/campaigns/:id for results.'
      };
      
      console.log('🔥 [API] Response sent:', campaignData);
      res.json(campaignData);
    } catch (queueError) {
      console.error('Queue error:', queueError);
      
      // Update campaign status to failed using correct method
      await Campaign.updateStatus(campaign.id, 'failed');
      
      res.status(500).json({
        error: 'QUEUE_ERROR',
        message: 'Failed to start campaign processing',
        details: queueError instanceof Error ? queueError.message : 'Unknown error',
        campaignId: campaign.id
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in search prospects endpoint:', error);
    res.status(500).json({
      error: 'Failed to search prospects',
      message: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
    });
  }
}));

export default router;