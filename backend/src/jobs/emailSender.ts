import { Worker, Job } from 'bullmq';
import { emailQueue } from '../config/redis';
import { EmailJobData } from '../services/queueTypes';
import { OpenAIService } from '../services/openaiService';
import { GmailService, GmailTokens } from '../services/gmailService';
import { TokenManager } from '../services/tokenManager';
import { User } from '../models/User';
import { NonRetriableError } from '../utils/errors';
import { checkEmailRateLimit } from '../middleware/rateLimiter';

/**
 * Process an email sending job
 */
async function processEmail(job: { data: EmailJobData }): Promise<void> {
  const { campaignId, candidateId, candidate, campaignData, userId } = job.data;
  
  try {
    console.log(`[Email ${candidateId}] Starting email generation and sending`);
    
    // Step 1: Check rate limits
    console.log(`[Email ${candidateId}] Checking rate limits`);
    const rateLimitCheck = await checkEmailRateLimit(userId);
    
    if (!rateLimitCheck.canSend) {
      const waitTime = rateLimitCheck.waitTime || 300; // Default to 5 minutes if no wait time provided
      console.log(`[Email ${candidateId}] Rate limited: ${rateLimitCheck.reason}, waiting ${waitTime}s`);
      // Delay the job and retry with appropriate backoff
      const error = new Error(`Rate limited: ${rateLimitCheck.reason}`);
      (error as any).delay = waitTime * 1000; // Convert to milliseconds
      throw error;
    }
    
    // Step 2: Get valid Gmail tokens (handled by TokenManager)
    console.log(`[Email ${candidateId}] Getting valid Gmail tokens`);
    const validTokens = await TokenManager.getValidTokens(userId);
    if (!validTokens) {
      throw new NonRetriableError('User has not connected Gmail account or tokens are invalid');
    }
    
    // Step 4: Generate email content using OpenAI
    console.log(`[Email ${candidateId}] Generating email content`);
    const template = "Hi {name}, I came across your experience and thought you'd be a great fit for a {role_title} role here at {recruiter_company}. We're passionate about {recruiter_mission}, and I think your experience aligns perfectly with what we're looking for. Would you be open to a quick chat about this opportunity? Best, {recruiter_name}";
    
    const emailContent = await OpenAIService.generateRecruitingEmail(
      candidate,
      campaignData,
      template
    );
    
    // Validate email content
    if (!emailContent?.body || !emailContent?.subject) {
      throw new NonRetriableError('Generated email content is invalid - missing subject or body');
    }
    
    console.log(`[Email ${candidateId}] Generated email - Subject: ${emailContent.subject}`);
    
    // Step 5: Send email via Gmail
    console.log(`[Email ${candidateId}] Sending email via Gmail`);
    const emailResult = await GmailService.sendRecruitingEmail(
      userId,
      candidate,
      emailContent.subject,
      emailContent.body
    );
    
    if (!emailResult.success) {
      if (emailResult.rateLimited) {
        // If rate limited by Gmail, delay and retry
        console.warn(`[Email ${candidateId}] Gmail rate limited, will retry`);
        throw new Error('Gmail rate limit exceeded');
      } else {
        // Other errors
        throw new Error(`Gmail sending failed: ${emailResult.error}`);
      }
    }
    
    console.log(`[Email ${candidateId}] Email sent successfully! MessageId: ${emailResult.messageId}`);
    
    // Step 6: Update campaign statistics (optional)
    // await Campaign.incrementEmailsSent(campaignId);
    
  } catch (error) {
    console.error(`[Email ${candidateId}] Error processing email:`, error);
    throw error; // Let BullMQ handle retries
  }
}

// Create and configure the worker with updated retry settings
const emailWorker = new Worker('email-sending', processEmail, {
  connection: emailQueue.opts.connection,
  concurrency: 1, // Process one email at a time to respect rate limits
  settings: {
    backoffStrategy: ((attemptsMade: number, type: string, error: any) => {
      // Use the delay from the error if it exists (for rate limiting)
      if (error?.delay) {
        return error.delay;
      }
      
      // Fallback to default backoff strategy for other errors
      if (attemptsMade <= 3) {
        return 30000; // Wait 30 seconds for transient issues
      }
      return Math.min(300000, Math.pow(2, attemptsMade) * 1000); // Exponential backoff, max 5 minutes
    }) as any
  }
});

// Event listeners
emailWorker.on('completed', (job: Job<EmailJobData>) => {
  console.log(`[Email ${job.data.candidateId}] Email job completed successfully`);
});

emailWorker.on('failed', (job: Job<EmailJobData> | undefined, error: Error) => {
  const jobId = job?.id || 'unknown';
  const candidateId = job?.data.candidateId || 'unknown';
  
  if (error instanceof NonRetriableError) {
    console.warn(`[Job ${jobId}][Email ${candidateId}] Non-retriable error: ${error.message}`);
    // Mark the job as failed without retrying
    job?.discard();
  } else {
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts.attempts || 1;
    
    if (attemptsMade >= maxAttempts) {
      console.error(`[Job ${jobId}][Email ${candidateId}] Failed after ${maxAttempts} attempts:`, error.message);
    } else {
      console.warn(`[Job ${jobId}][Email ${candidateId}] Attempt ${attemptsMade + 1} failed, will retry:`, error.message);
    }
  }
});

emailWorker.on('error', (error: Error) => {
  console.error('Email worker error:', error);
});

// Handle process termination
const shutdown = async () => {
  console.log('Shutting down email worker...');
  await emailWorker.close();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { emailWorker };
