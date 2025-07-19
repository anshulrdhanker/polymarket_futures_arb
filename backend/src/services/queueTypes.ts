import { CreateCampaignData } from '../models/Campaign';

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

// Conversation data structure for user interaction
export interface ConversationData {
  // Base required fields for all outreach types
  outreach_type: 'sales' | 'recruiting';
  user_title: string;
  user_company: string;
  user_mission: string;
  
  // Optional fields for recruiting
  role_title?: string;
  skills?: string[];  // Using string[] to match usage in the codebase
  experience_level?: 'junior' | 'mid' | 'senior' | 'lead';
  
  // Optional fields for sales
  buyer_title?: string;
  pain_point?: string;
  
  // Optional fields for both
  company_size?: string;
  industry?: string;
  location?: string;
  
  // Additional metadata
  additional_variables?: Record<string, any>;
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
