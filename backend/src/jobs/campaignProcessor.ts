console.log('🔥 [WORKER] campaignProcessor.ts file loaded!');

import { Worker } from 'bullmq';
import { campaignQueue } from '../config/redis';
import { CampaignJobData } from '../services/queueTypes';
import { OpenAIService } from '../services/openaiService';
import { PDLService, Candidate as PDLCandidate } from '../services/pdlService';
import { QueueService } from '../services/queueService';
import { Candidate } from '../models/Candidate';
import { Campaign } from '../models/Campaign';

/**
 * Process a campaign job
 */
async function processCampaign(job: { data: CampaignJobData }): Promise<void> {
  const { campaignId, userId, conversationData } = job.data;

  console.log(`[Worker] Starting campaign ${campaignId} for user ${userId}`);
  await Campaign.updateStatus(campaignId, 'searching');
  console.log(`[Worker] Status updated to 'searching' for campaign ${campaignId}`);

  try {
    console.log(`[Worker] Searching for candidates for campaign ${campaignId}`);
    const pdlResults = await PDLService.searchFromConversation(conversationData, 3);
    
    console.log(`[Worker] Found ${pdlResults?.length || 0} candidates for campaign ${campaignId}`);
    
    // Handle case where no candidates are found
    if (!pdlResults || pdlResults.length === 0) {
      console.log(`[Worker] No candidates found for campaign ${campaignId}, marking as completed`);
      await Campaign.updateStatus(campaignId, 'completed');
      console.log(`[Worker] Campaign ${campaignId} marked as completed with 0 candidates`);
      return;
    }

    // Process and save candidates
    console.log(`[Worker] Processing ${pdlResults.length} candidates for campaign ${campaignId}`);
    
    // First, filter out candidates without work emails
    const validCandidates = pdlResults.filter(pdlData => 
      pdlData.work_email && pdlData.work_email.includes('@')
    );
    
    console.log(`[Worker] Found ${validCandidates.length} candidates with valid emails out of ${pdlResults.length} total`);
    
    const candidatesToSave = validCandidates.map((pdlData: PDLCandidate & {
      first_name?: string;
      last_name?: string;
      job_company_name?: string;
      job_title?: string;
      location_name?: string;
      linkedin_url?: string;
      skills?: string[];
      inferred_years_experience?: number;
    }) => {
      const fullName = pdlData.full_name || 
        [pdlData.first_name, pdlData.last_name].filter(Boolean).join(' ').trim() || 
        'Unknown';
      
      return {
        campaign_id: campaignId,
        full_name: fullName,
        email: pdlData.work_email || '', // This is guaranteed to exist due to filter above
        current_company: pdlData.job_company_name || '',
        current_title: pdlData.job_title || '',
        location: pdlData.location_name || '',
        linkedin_url: pdlData.linkedin_url || '',
        skills: Array.isArray(pdlData.skills) ? pdlData.skills.filter(Boolean) : [],
        experience_years: pdlData.inferred_years_experience,
        pdl_profile_data: pdlData,
        status: 'found' as const,
        match_score: 1.0
      };
    });

    // Save valid candidates to database
    const savedCandidates = await Candidate.createBatch(candidatesToSave);
    console.log(`[Worker] Successfully saved ${savedCandidates.length} candidates for campaign ${campaignId}`);
    
    // Update campaign with total found count (only those with valid emails)
    if (savedCandidates.length > 0) {
      await Campaign.incrementTotalFound(campaignId, savedCandidates.length);
      console.log(`[Worker] Updated total found count to ${savedCandidates.length} for campaign ${campaignId}`);
      
      // Queue email generation for valid candidates
      console.log(`[Worker] Queueing ${savedCandidates.length} emails for campaign ${campaignId}`);
      await QueueService.queueEmailGeneration(campaignId, userId, savedCandidates, conversationData);
    } else {
      console.log(`[Worker] No candidates with valid emails to queue emails for campaign ${campaignId}`);
    }

    // Mark campaign as completed
    await Campaign.updateStatus(campaignId, 'completed');
    console.log(`[Worker] Campaign ${campaignId} marked as completed with ${savedCandidates.length} candidates`);

  } catch (error) {
    console.error(`[Worker] Error processing campaign ${campaignId}:`, error);
    
    // Mark campaign as failed
    try {
      await Campaign.updateStatus(campaignId, 'failed');
      console.error(`[Worker] Marked campaign ${campaignId} as failed due to error`);
    } catch (statusError) {
      console.error(`[Worker] Failed to update status to 'failed' for campaign ${campaignId}:`, statusError);
    }
    
    // Re-throw to let BullMQ handle retries
    throw error;
  }
}

// Create and configure the worker
const campaignWorker = new Worker('campaign-processing', processCampaign, {
  connection: campaignQueue.opts.connection,
  concurrency: 1, // Process one campaign at a time
});

// Test Redis connection and log worker status
console.log('🔥 [WORKER] Testing Redis connection...');
campaignQueue.getJobs(['waiting', 'active']).then(jobs => {
  console.log('🔥 [WORKER] Found jobs in queue:', jobs.length);
}).catch(err => {
  console.error('🔥 [WORKER] Redis connection test failed:', err);
});

campaignWorker.on('ready', () => {
  console.log('🔥 [WORKER] Worker is ready and connected to Redis!');
});

// Event listeners with proper TypeScript types
campaignWorker.on('active', (job) => {
  console.log(`🔥 [WORKER] Job became active: ${job.id}`);
});

// The 'waiting' event is not a standard BullMQ worker event, so we'll remove it
// and only keep the standard events: 'active', 'completed', 'failed', and 'error'

campaignWorker.on('completed', (job) => {
  console.log(`🔥 [WORKER] Job completed: ${job.id}`);
});

campaignWorker.on('failed', (job, error) => {
  const jobId = job?.id || 'unknown';
  console.error(`🔥 [WORKER] Job failed: ${jobId}`, error);
});

campaignWorker.on('error', (error) => {
  console.error('🔥 [WORKER] Campaign worker error:', error);
});

// Handle process termination
const shutdown = async () => {
  console.log('Shutting down campaign worker...');
  await campaignWorker.close();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { campaignWorker };
