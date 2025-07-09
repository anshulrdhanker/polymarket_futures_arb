import { supabase } from '../config/database';
import { CampaignStatus } from '../services/queueTypes';

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
  // Variable storage for email personalization
  recruiter_name: string;
  recruiter_company: string;
  recruiter_title: string;
  recruiter_mission: string;
  prospect_industry: string;
  is_remote: string; // "remote", "hybrid", "on-site"
  specific_skills?: string[];
  experience_level?: string;
  company_size?: string;
  additional_variables?: Record<string, string>;
}

export interface CampaignProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  role_requirements: string;
  company_description: string;
  job_location: string | null;
  salary_range: string | null;
  remote_ok: boolean;
  target_emails: number;
  status: CampaignStatus;
  pdl_search_params: any;
  total_found: number;
  total_sent: number;
  created_at: string;
  completed_at: string | null;
  // Variable storage for email personalization
  recruiter_name: string;
  recruiter_company: string;
  recruiter_title: string;
  recruiter_mission: string;
  prospect_industry: string;
  is_remote: string;
  specific_skills: string[] | null;
  experience_level: string | null;
  company_size: string | null;
  additional_variables: Record<string, string> | null;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_candidates_found: number;
  total_emails_sent: number;
  average_response_rate: number;
}

export class Campaign {
  /**
   * Create a new recruiting campaign
   */
  static async create(campaignData: CreateCampaignData): Promise<CampaignProfile | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          user_id: campaignData.user_id,
          name: campaignData.name,
          role_title: campaignData.role_title,
          role_requirements: campaignData.role_requirements,
          company_description: campaignData.company_description,
          job_location: campaignData.job_location || null,
          salary_range: campaignData.salary_range || null,
          remote_ok: campaignData.remote_ok || false,
          target_emails: campaignData.target_emails || 50,
          status: 'draft',
          pdl_search_params: {
            // Store extra data in this JSON field
            recruiter_name: campaignData.recruiter_name,
            recruiter_company: campaignData.recruiter_company,
            recruiter_title: campaignData.recruiter_title,
            recruiter_mission: campaignData.recruiter_mission,
            prospect_industry: campaignData.prospect_industry,
            specific_skills: campaignData.specific_skills,
            experience_level: campaignData.experience_level,
            company_size: campaignData.company_size,
            additional_variables: campaignData.additional_variables,
          },
          total_found: 0,
          total_sent: 0,
          created_at: new Date().toISOString(),
          completed_at: null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in Campaign.create:', error);
      return null;
    }
  }

  /**
   * Find campaign by ID
   */
  static async findById(campaignId: string): Promise<CampaignProfile | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in Campaign.findById:', error);
      return null;
    }
  }

  /**
   * Get all campaigns for a user
   */
  static async findByUserId(userId: string, limit: number = 50): Promise<CampaignProfile[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user campaigns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Campaign.findByUserId:', error);
      return [];
    }
  }

  /**
   * Update campaign status
   */
  static async updateStatus(campaignId: string, status: CampaignStatus): Promise<boolean> {
    try {
      const updateData: any = {
        status,
      };

      // Set completed_at when status changes to completed
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating campaign status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.updateStatus:', error);
      return false;
    }
  }

  /**
   * Update PDL search parameters
   */
  static async updatePDLSearchParams(campaignId: string, searchParams: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          pdl_search_params: searchParams,
        })
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating PDL search params:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.updatePDLSearchParams:', error);
      return false;
    }
  }

  /**
   * Get all campaign variables for email personalization
   */
  static async getCampaignVariables(campaignId: string): Promise<Record<string, string> | null> {
    try {
      const campaign = await this.findById(campaignId);
      if (!campaign) return null;

      const variables: Record<string, string> = {
        role_title: campaign.role_title,
        recruiter_name: campaign.recruiter_name,
        recruiter_company: campaign.recruiter_company,
        recruiter_title: campaign.recruiter_title,
        recruiter_mission: campaign.recruiter_mission,
        prospect_industry: campaign.prospect_industry,
        location: campaign.job_location || '',
        salary_range: campaign.salary_range || '',
        is_remote: campaign.is_remote,
        experience_level: campaign.experience_level || '',
        company_size: campaign.company_size || '',
      };

      // Add specific skills as comma-separated string
      if (campaign.specific_skills && campaign.specific_skills.length > 0) {
        variables.required_skills = campaign.specific_skills.join(', ');
      }

      // Add any additional variables
      if (campaign.additional_variables) {
        Object.assign(variables, campaign.additional_variables);
      }

      return variables;
    } catch (error) {
      console.error('Error in Campaign.getCampaignVariables:', error);
      return null;
    }
  }

  /**
   * Update campaign variables
   */
  static async updateVariables(campaignId: string, variables: {
    recruiter_name?: string;
    recruiter_company?: string;
    recruiter_title?: string;
    recruiter_mission?: string;
    prospect_industry?: string;
    is_remote?: string;
    specific_skills?: string[];
    experience_level?: string;
    company_size?: string;
    additional_variables?: Record<string, string>;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(variables)
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating campaign variables:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.updateVariables:', error);
      return false;
    }
  }

  /**
   * Generate PDL search parameters from campaign data
   */
  static async generatePDLSearchParams(campaignId: string): Promise<any> {
    try {
      const campaign = await this.findById(campaignId);
      if (!campaign) return null;

      // Build PDL search parameters based on campaign variables
      const searchParams: any = {
        required: []
      };

      // Add role/title criteria
      if (campaign.role_title) {
        searchParams.required.push({
          field: "job_title",
          condition: "contains",
          value: campaign.role_title
        });
      }

      // Add skills criteria
      if (campaign.specific_skills && campaign.specific_skills.length > 0) {
        searchParams.required.push({
          field: "skills",
          condition: "contains",
          value: campaign.specific_skills
        });
      }

      // Add industry criteria
      if (campaign.prospect_industry) {
        searchParams.required.push({
          field: "industry",
          condition: "contains",
          value: campaign.prospect_industry
        });
      }

      // Add location criteria if not remote
      if (campaign.is_remote !== 'remote' && campaign.job_location) {
        searchParams.required.push({
          field: "location_region",
          condition: "contains",
          value: campaign.job_location
        });
      }

      // Add experience level criteria
      if (campaign.experience_level) {
        searchParams.required.push({
          field: "job_title_levels",
          condition: "contains",
          value: campaign.experience_level
        });
      }

      return searchParams;
    } catch (error) {
      console.error('Error in Campaign.generatePDLSearchParams:', error);
      return null;
    }
  }

  /**
   * Create campaign variables object for email generation
   */
  static createEmailVariables(campaign: CampaignProfile, candidate: any): Record<string, string> {
    return {
      // Campaign variables
      role_title: campaign.role_title,
      recruiter_name: campaign.recruiter_name,
      recruiter_company: campaign.recruiter_company,
      recruiter_title: campaign.recruiter_title,
      recruiter_mission: campaign.recruiter_mission,
      location: campaign.job_location || '',
      salary_range: campaign.salary_range || '',
      is_remote: campaign.is_remote,
      
      // Candidate variables
      name: candidate.full_name || '',
      skills: candidate.selected_skill || (candidate.skills && candidate.skills.length > 0 ? candidate.skills[0] : ''),
      current_company: candidate.current_company || '',
      current_title: candidate.current_title || '',
      candidate_location: candidate.location || '',
      experience_years: candidate.experience_years ? candidate.experience_years.toString() : '',
      
      // Additional variables
      ...(campaign.additional_variables || {})
    };
  }

  /**
   * Update campaign statistics
   */
  static async updateStats(campaignId: string, stats: {
    total_found?: number;
    total_sent?: number;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(stats)
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating campaign stats:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.updateStats:', error);
      return false;
    }
  }

  /**
   * Increment total found count
   */
  static async incrementTotalFound(campaignId: string, count: number = 1): Promise<boolean> {
    try {
      // First get current value
      const campaign = await this.findById(campaignId);
      if (!campaign) return false;

      // Then update with incremented value
      const { error } = await supabase
        .from('campaigns')
        .update({
          total_found: campaign.total_found + count,
        })
        .eq('id', campaignId);

      if (error) {
        console.error('Error incrementing total found:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.incrementTotalFound:', error);
      return false;
    }
  }

  /**
   * Increment total sent count
   */
  static async incrementTotalSent(campaignId: string, count: number = 1): Promise<boolean> {
    try {
      // First get current value
      const campaign = await this.findById(campaignId);
      if (!campaign) return false;

      // Then update with incremented value
      const { error } = await supabase
        .from('campaigns')
        .update({
          total_sent: campaign.total_sent + count,
        })
        .eq('id', campaignId);

      if (error) {
        console.error('Error incrementing total sent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.incrementTotalSent:', error);
      return false;
    }
  }

  /**
   * Get campaign statistics for a user
   */
  static async getStatsForUser(userId: string): Promise<CampaignStats> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) {
        console.error('Error fetching campaign stats:', error);
        return this.getEmptyStats();
      }

      const stats = data.reduce((acc, campaign) => {
        acc.total_campaigns += 1;
        if (campaign.status === 'active') acc.active_campaigns += 1;
        acc.total_candidates_found += campaign.total_found || 0;
        acc.total_emails_sent += campaign.total_sent || 0;
        return acc;
      }, this.getEmptyStats());

      // Calculate average response rate (placeholder - would need reply data from candidates table)
      stats.average_response_rate = 0; // TODO: Calculate from candidates table

      return stats;
    } catch (error) {
      console.error('Error in Campaign.getStatsForUser:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get campaigns that need processing (draft or processing status)
   */
  static async getPendingCampaigns(limit: number = 50): Promise<CampaignProfile[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['draft', 'processing'])
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting pending campaigns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingCampaigns:', error);
      return [];
    }
  }

  /**
   * Get active campaigns for email sending
   */
  static async getActiveCampaigns(limit: number = 50): Promise<CampaignProfile[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['sending', 'processing'])
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting active campaigns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveCampaigns:', error);
      return [];
    }
  }

  /**
   * Delete a campaign
   */
  static async delete(campaignId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) {
        console.error('Error deleting campaign:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Campaign.delete:', error);
      return false;
    }
  }

  /**
   * Pause/Resume campaign
   */
  static async togglePause(campaignId: string): Promise<boolean> {
    try {
      // Get current status
      const campaign = await this.findById(campaignId);
      if (!campaign) return false;

      const newStatus: CampaignStatus = campaign.status === 'paused' ? 'sending' : 'paused';
      return this.updateStatus(campaignId, newStatus);
    } catch (error) {
      console.error('Error in Campaign.togglePause:', error);
      return false;
    }
  }

  /**
   * Check if campaign has reached target emails
   */
  static async hasReachedTarget(campaignId: string): Promise<boolean> {
    try {
      const campaign = await this.findById(campaignId);
      if (!campaign) return false;

      return campaign.total_sent >= campaign.target_emails;
    } catch (error) {
      console.error('Error in Campaign.hasReachedTarget:', error);
      return false;
    }
  }

  /**
   * Helper to get empty stats object
   */
  static getEmptyStats(): CampaignStats {
    return {
      total_campaigns: 0,
      active_campaigns: 0,
      total_candidates_found: 0,
      total_emails_sent: 0,
      average_response_rate: 0
    };
  }
}