console.log('🔥 [WORKER] campaignProcessor.ts file loaded!');

import { Worker } from 'bullmq';
import { campaignQueue } from '../config/redis';
import { CampaignJobData } from '../services/queueTypes';
import { OpenAIService } from '../services/openaiService';
import { PDLService, Candidate as PDLCandidate } from '../services/pdlService';
import { QueueService } from '../services/queueService';
import { Candidate } from '../models/Candidate';

/**
 * Process a campaign job
 */
async function processCampaign(job: { data: CampaignJobData }): Promise<void> {
  console.log("🔥 [WORKER] Campaign processor started for:", job.data.campaignId);
  
  const { campaignId, userId, conversationData } = job.data;
  
  try {
    console.log("🔥 [WORKER] Step 1: Starting campaign processing");
    
    // Step 1: Search for candidates
    console.log("🔥 [WORKER] Step 2: Searching for candidates with PDL");
    const pdlResults = await PDLService.searchFromConversation(conversationData, 3); // Test with 3
    
    console.log("🔥 [WORKER] Step 3: Found candidates:", pdlResults.length);
    
    if (!pdlResults || pdlResults.length === 0) {
      console.warn("🔥 [WORKER] No candidates found");
      return;
    }

    // Step 2: Save candidates to database
    console.log(`[Campaign ${campaignId}] Saving ${pdlResults.length} candidates to database`);
    const candidateData = pdlResults.map((prospect: any) => {
      // Type assertion for PDL response data
      const pdlData = prospect as PDLCandidate & {
        first_name?: string;
        last_name?: string;
        inferred_years_experience?: number;
      };

      // Extract name - use full_name if available, otherwise construct from first/last
      const fullName = pdlData.full_name || 
        [pdlData.first_name, pdlData.last_name].filter(Boolean).join(' ').trim() || 
        'Unknown';
      
      // Extract experience - use inferred_years_experience from PDL
      const experienceYears = pdlData.inferred_years_experience;
      
      // Extract skills - use skills array directly from PDL
      const skills = Array.isArray(pdlData.skills) 
        ? pdlData.skills.filter(Boolean)
        : [];
      
      return {
        campaign_id: campaignId,
        full_name: fullName,
        email: pdlData.work_email || '',
        current_company: pdlData.job_company_name || '',
        current_title: pdlData.job_title || '',
        location: pdlData.location_name || '',
        linkedin_url: pdlData.linkedin_url || '',
        skills,
        experience_years: experienceYears,
        pdl_profile_data: pdlData,
        status: 'found' as const,
        match_score: 1.0
      };
    });

    const savedCandidates = await Candidate.createBatch(candidateData);
    console.log(`[Campaign ${campaignId}] Successfully saved ${savedCandidates.length} candidates`);
    
    // Step 3: Queue email generation with saved candidates
    console.log(`[Campaign ${campaignId}] Queueing ${savedCandidates.length} emails`);
    await QueueService.queueEmailGeneration(campaignId, userId, savedCandidates, conversationData);
    
    console.log("🔥 [WORKER] Step 4: Campaign processing completed successfully");
  } catch (error) {
    console.error("🔥 [WORKER] Error processing campaign:", error);
    throw error; // Let BullMQ handle retries
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
