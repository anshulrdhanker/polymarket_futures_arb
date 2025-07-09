// Campaign status types
export type CampaignStatus = 
  | 'draft'          // Initial state
  | 'validating'     // Data validation in progress
  | 'searching'      // Finding candidates (PDL search)
  | 'generating'     // Creating email content
  | 'sending'        // Actively sending emails
  | 'paused'         // Manually paused
  | 'completed'      // All emails sent
  | 'failed';        // Processing failed

// Core campaign data structure
export interface CreateCampaignData {
  user_id: string;
  name: string;
  role_title: string;
  role_requirements: string;
  company_description: string;
  job_location?: string;
  salary_range?: string;
  remote_ok?: boolean;
  target_emails?: number;
  status?: CampaignStatus;
  recruiter_name: string;
  recruiter_company: string;
  recruiter_title: string;
  recruiter_mission: string;
  prospect_industry: string;
  is_remote: string;
  specific_skills?: string[];
  experience_level?: string;
  company_size?: string;
  additional_variables?: Record<string, any>;
}

// Conversation data from user interaction
export interface ConversationData {
  recruiter_title: string;
  recruiter_company: string;
  recruiter_mission: string;
  role_title: string;
  skills: string;
  experience_level: 'junior' | 'mid' | 'senior' | 'lead';
  company_size?: string;
  industry?: string;
  location?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  received?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Types for campaign processing queue
export interface CampaignJobData {
  campaignId: string;
  userId: string;
  conversationData: any; // Will be typed more specifically later
}

// Types for email sending queue
export interface EmailJobData {
  campaignId: string;
  candidateId: string;
  userId: string;
  candidate: any;      // Will be typed more specifically later
  campaignData: any;   // Will be typed more specifically later
}

// Progress tracking for long-running jobs
export interface JobProgress {
  campaignId: string;
  stage: 'searching' | 'generating' | 'sending' | 'completed' | 'failed';
  totalCandidates?: number;
  processedCandidates?: number;
  emailsSent?: number;
  errors?: string[];
  startedAt: Date;
  completedAt?: Date;
}

// Rate limiting configuration
export interface RateLimitConfig {
  pdl: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
  gmail: {
    emailsPerDay: number;
    emailsPerSecond: number;
  };
  openai: {
    maxConcurrent: number;
    retryDelay: number;
  };
}

// Rate limits for external services
export const RATE_LIMITS: RateLimitConfig = {
  pdl: {
    requestsPerMinute: 10,
    delayBetweenRequests: 7000, // 7 seconds between requests
  },
  gmail: {
    emailsPerDay: 250,
    emailsPerSecond: 1,
  },
  openai: {
    maxConcurrent: 5,
    retryDelay: 1000, // 1 second
  },
};
