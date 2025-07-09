import { Worker } from 'bullmq';
import { campaignQueue } from '../config/redis';
import { CampaignJobData } from '../services/queueTypes';
import { OpenAIService } from '../services/openaiService';
import { PDLService } from '../services/pdlService';
import { QueueService } from '../services/queueService';

/**
 * Process a campaign job
 */
async function processCampaign(job: { data: CampaignJobData }): Promise<void> {
  const { campaignId, userId, conversationData } = job.data;
  
  try {
    console.log(`[Campaign ${campaignId}] Starting campaign processing`);
    
    // Step 1: Convert conversation to PDL query
    console.log(`[Campaign ${campaignId}] Converting conversation to PDL query`);
    const pdlQuery = await OpenAIService.convertToPDLQuery(conversationData);
    
    // Step 2: Search for candidates
    console.log(`[Campaign ${campaignId}] Searching for candidates`);
    const candidates = await PDLService.searchCandidates(pdlQuery);
    
    if (!candidates || candidates.length === 0) {
      console.warn(`[Campaign ${campaignId}] No candidates found`);
      return;
    }
    
    // Step 3: Queue email generation
    console.log(`[Campaign ${campaignId}] Queueing ${candidates.length} emails`);
    await QueueService.queueEmailGeneration(campaignId, userId, candidates, conversationData);
    
    console.log(`[Campaign ${campaignId}] Campaign processing completed successfully`);
  } catch (error) {
    console.error(`[Campaign ${campaignId}] Error processing campaign:`, error);
    throw error; // Let BullMQ handle retries
  }
}

// Create and configure the worker
const campaignWorker = new Worker('campaign-processing', processCampaign, {
  connection: campaignQueue.opts.connection,
  concurrency: 1, // Process one campaign at a time
});

// Event listeners
campaignWorker.on('completed', (job) => {
  console.log(`[Campaign ${job.data.campaignId}] Job completed`);});

campaignWorker.on('failed', (job, error) => {
  console.error(`[Campaign ${job?.data?.campaignId || 'unknown'}] Job failed:`, error);
});

campaignWorker.on('error', (error) => {
  console.error('Campaign worker error:', error);
});

// Handle process termination
const shutdown = async () => {
  console.log('Shutting down campaign worker...');
  await campaignWorker.close();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { campaignWorker };
