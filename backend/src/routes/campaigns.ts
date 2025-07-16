import { Router, Request, Response, NextFunction } from 'express';
import { authenticateUser } from '../middleware/authMiddleware';
import { campaignCreationLimiter } from '../middleware/rateLimit';
import campaignController from '../controllers/campaignController';
import { OpenAIService, ConversationState } from '../services/openaiService';
import { PDLService } from '../services/pdlService';

const router = Router();

// Authentication disabled for development
// router.use(authenticateUser);

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

// POST /api/campaigns/:id/chat - Handle conversation messages
router.post(
  '/:id/chat',
  asyncHandler(async (req, res) => {
    const { id: campaignId } = req.params;
    const { message, conversationState } = req.body;

    try {
      // Special case: Initialize conversation (first call with no message)
      if (!message) {
        const initialResponse = OpenAIService.initializeConversation();
        res.json({
          response: initialResponse.message,
          conversationState: initialResponse.conversationState,
          should_search: false,
          pdlQuery: null
        });
        return;
      }

      // Validate message for normal conversation
      if (typeof message !== 'string') {
        res.status(400).json({ error: 'Message must be a string' });
        return;
      }

      // Normal conversation processing
      if (!conversationState) {
        res.status(400).json({ error: 'Conversation state is required for message processing' });
        return;
      }

      const response = await OpenAIService.processScriptedConversation(
        message,
        conversationState
      );

      res.json({
        response: response.message,
        conversationState: response.conversationState,
        should_search: response.conversationState.isComplete,
        pdlQuery: response.pdlQuery
      });
      return;

    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to process conversation',
        message: 'Sorry, I encountered an error. Could you please try again?'
      });
      return;
    }
  })
);

// POST /api/campaigns/:id/search - Trigger prospect search
router.post(
  '/:id/search',
  asyncHandler(async (req, res) => {
    const { id: campaignId } = req.params;
    const { pdlQuery, conversationState, maxCandidates = 50 } = req.body;

    try {
      // Validate that conversation is complete
      if (!conversationState?.isComplete) {
        res.status(400).json({ 
          error: 'Conversation must be completed before searching for prospects' 
        });
        return;
      }

      let candidates;
      let searchQuery = pdlQuery;

      // Use PDL service to search for real candidates
      if (conversationState?.collectedData) {
        // Search directly from conversation data
        console.log('Searching candidates using conversation data for campaign:', campaignId);
        candidates = await PDLService.searchFromConversation(
          conversationState.collectedData, 
          maxCandidates
        );
        
        // Also get the PDL query for logging
        if (!searchQuery) {
          searchQuery = await OpenAIService.convertToPDLQuery(conversationState.collectedData);
        }
      } else if (searchQuery) {
        // Search using provided PDL query
        console.log('Searching candidates using provided PDL query for campaign:', campaignId);
        candidates = await PDLService.searchCandidates(searchQuery, maxCandidates);
      } else {
        res.status(400).json({ 
          error: 'Either conversationState with collectedData or pdlQuery is required' 
        });
        return;
      }

      // Transform PDL candidates to frontend format
      const prospects = candidates.map(candidate => ({
        name: candidate.full_name || `${candidate.first_name} [Last Name Private]`,
        title: candidate.job_title || 'Title not available',
        company: candidate.job_company_name || 'Company not available',
        email: candidate.work_email,
        linkedin: candidate.linkedin_url,
        location: candidate.location_name || 'Location not specified',
        // Add some mock skills since PDL doesn't always return structured skills
        skills: [], // Could be enhanced to extract from job descriptions
        experience_years: null // PDL doesn't provide this directly
      }));

      console.log(`Found ${prospects.length} prospects for campaign ${campaignId}`);

      // TODO: Store prospects in database for campaign
      // await campaignController.storeProspects(campaignId, prospects);

      res.json({
        prospects,
        count: prospects.length,
        query_used: searchQuery,
        campaign_id: campaignId,
        search_method: conversationState?.collectedData ? 'conversation' : 'query'
      });

    } catch (error) {
      console.error('Error in search endpoint:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a PDL-specific error
      if (errorMessage.includes('PDL API')) {
        res.status(503).json({ 
          error: 'Search service temporarily unavailable',
          message: 'Unable to search for candidates at this time. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to search for prospects',
          message: 'An unexpected error occurred while searching for candidates.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      }
    }
  })
);

// POST /api/campaigns/:id/outreach - Send outreach emails
router.post(
  '/:id/outreach',
  asyncHandler(async (req, res) => {
    const { id: campaignId } = req.params;
    const { prospects, emailTemplate } = req.body;

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      res.status(400).json({ error: 'Prospects array is required' });
      return;
    }

    try {
      // TODO: Get campaign info and email template from database
      const mockCampaignInfo = {
        role_title: 'Software Engineer',
        recruiter_name: 'John Recruiter',
        recruiter_company: 'Tech Corp',
        recruiter_title: 'Senior Recruiter',
        recruiter_mission: 'We help companies build amazing products',
        location: 'San Francisco, CA',
        salary_range: '$120k - $160k',
        is_remote: 'Hybrid'
      };

      const defaultTemplate = `
Hi {name},

I hope this email finds you well! I came across your profile and was impressed by your experience with {skills}.

We're currently looking for a {role_title} to join our team at {recruiter_company}. {recruiter_mission}

I'd love to chat more about this opportunity if you're interested. Are you available for a quick 15-minute call this week?

Best regards,
{recruiter_name}
{recruiter_title}
{recruiter_company}
      `.trim();

      const template = emailTemplate || defaultTemplate;
      const results = [];

      // Process each prospect
      for (const prospect of prospects) {
        try {
          // Generate personalized email using OpenAI
          const emailContent = await OpenAIService.generateRecruitingEmail(
            prospect,
            mockCampaignInfo,
            template
          );

          // TODO: Send email via Gmail API
          // await gmailService.sendEmail({
          //   to: prospect.email,
          //   subject: emailContent.subject,
          //   body: emailContent.body
          // });

          results.push({
            prospect: prospect.name,
            email: prospect.email,
            status: 'sent',
            subject: emailContent.subject,
            // Don't return full email body for privacy
            preview: emailContent.body.substring(0, 100) + '...'
          });

        } catch (error) {
          console.error(`Failed to send email to ${prospect.name}:`, error);
          results.push({
            prospect: prospect.name,
            email: prospect.email,
            status: 'failed',
            error: 'Failed to generate or send email'
          });
        }
      }

      // Count successful sends
      const successful = results.filter(r => r.status === 'sent').length;
      const failed = results.filter(r => r.status === 'failed').length;

      res.json({
        message: `Outreach process completed`,
        summary: {
          total: prospects.length,
          successful,
          failed
        },
        results,
        campaign_id: campaignId
      });

    } catch (error) {
      console.error('Error in outreach endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Failed to send outreach emails',
        message: 'Unable to send emails at this time. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  })
);

// GET /api/campaigns/:id/prospects - Get stored prospects for campaign
router.get(
  '/:id/prospects',
  asyncHandler(async (req, res) => {
    const { id: campaignId } = req.params;

    try {
      // TODO: Retrieve prospects from database
      // const prospects = await campaignController.getProspects(campaignId);
      
      // For now, return empty array or mock data
      res.json({
        prospects: [],
        count: 0,
        campaign_id: campaignId
      });

    } catch (error) {
      console.error('Error retrieving prospects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Failed to retrieve prospects',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  })
);

export default router;