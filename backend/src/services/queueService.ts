import { JobState } from 'bullmq';
import { campaignQueue, emailQueue } from '../config/redis';
import { CampaignJobData, EmailJobData, RATE_LIMITS } from './queueTypes';

export class QueueService {
  /**
   * Start processing a new campaign
   */
  static async startCampaignProcessing(
    campaignId: string,
    userId: string,
    conversationData: any
  ): Promise<void> {
    try {
      const jobData: CampaignJobData = {
        campaignId,
        userId,
        conversationData,
      };

      await campaignQueue.add('process-campaign', jobData, {
        jobId: `campaign:${campaignId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds
        },
      });

      console.log(`[Queue] Started processing campaign ${campaignId}`);
    } catch (error) {
      console.error(`[Queue] Failed to start campaign ${campaignId}:`, error);
      throw new Error('Failed to start campaign processing');
    }
  }

  /**
   * Queue emails for a campaign
   */
  static async queueEmailGeneration(
    campaignId: string,
    userId: string,
    candidates: any[],
    campaignData: any
  ): Promise<void> {
    try {
      const jobs = candidates.map((candidate, index) => ({
        name: 'send-recruiting-email',
        data: {
          campaignId,
          candidateId: candidate.id,
          userId,
          candidate,
          campaignData,
        } as EmailJobData,
        opts: {
          delay: index * RATE_LIMITS.gmail.emailsPerSecond * 1000, // 1 second between emails
          jobId: `email:${campaignId}:${candidate.id}`,
          removeOnComplete: true,
          removeOnFail: 5, // Keep last 5 failed jobs for debugging
        },
      }));

      if (jobs.length > 0) {
        await emailQueue.addBulk(jobs);
        console.log(`[Queue] Queued ${jobs.length} emails for campaign ${campaignId}`);
      }
    } catch (error) {
      console.error(`[Queue] Failed to queue emails for campaign ${campaignId}:`, error);
      throw new Error('Failed to queue email generation');
    }
  }

  /**
   * Get status of a campaign's jobs
   */
  static async getCampaignStatus(campaignId: string): Promise<{
    campaign: any[];
    emails: any[];
  }> {
    try {
      const jobStates: JobState[] = ['completed', 'failed', 'active', 'waiting'];
      
      const [campaignJobs, emailJobs] = await Promise.all([
        campaignQueue.getJobs(jobStates),
        emailQueue.getJobs(jobStates),
      ]);

      const filterByCampaign = (job: any) => 
        job.data.campaignId === campaignId;

      const filteredCampaignJobs = campaignJobs.filter(filterByCampaign);
      const filteredEmailJobs = emailJobs.filter(filterByCampaign);

      const [campaignJobStates, emailJobStates] = await Promise.all([
        Promise.all(filteredCampaignJobs.map(job => job.getState())),
        Promise.all(filteredEmailJobs.map(job => job.getState())),
      ]);

      return {
        campaign: filteredCampaignJobs.map((job, index) => ({
          id: job.id,
          name: job.name,
          state: campaignJobStates[index],
          progress: job.progress,
          data: job.data,
        })),
        emails: filteredEmailJobs.map((job, index) => ({
          id: job.id,
          name: job.name,
          state: emailJobStates[index],
          candidateId: job.data.candidateId,
          progress: job.progress,
        })),
      };
    } catch (error) {
      console.error(`[Queue] Failed to get status for campaign ${campaignId}:`, error);
      throw new Error('Failed to get campaign status');
    }
  }

  /**
   * Get queue health metrics
   */
  static async getQueueHealth(): Promise<{
    campaign: any;
    emails: any;
    timestamp: string;
  }> {
    try {
      const [campaignCounts, emailCounts] = await Promise.all([
        campaignQueue.getJobCounts(),
        emailQueue.getJobCounts(),
      ]);

      return {
        campaign: campaignCounts,
        emails: emailCounts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Queue] Failed to get queue health:', error);
      throw new Error('Failed to get queue health');
    }
  }
}
