import { supabase } from '../config/database';
import { CampaignStatus } from '../services/queueTypes';

export interface CreateCampaignData {
  user_id: string;
  name: string;
  outreach_type: 'sales' | 'recruiting';
  
  // Role-specific fields (optional since they depend on outreach type)
  role_title?: string;
  role_requirements?: string;
  
  // User/company fields
  user_name: string;
  user_company: string;
  user_title: string;
  user_mission: string;
  
  // Campaign settings
  industry: string;
  is_remote: string; // "remote", "hybrid", "on-site"
  job_location?: string;
  salary_range?: string;
  remote_ok?: boolean;
  target_emails?: number;
  
  // Skills and experience
  specific_skills?: string[];
  experience_level?: string;
  company_size?: string;
  
  // Additional metadata
  additional_variables?: Record<string, string>;
}

export interface CampaignProfile {
  id: string;
  user_id: string;
  name: string;
  outreach_type: 'sales' | 'recruiting';
  
  // Role-specific fields
  role_title: string | null;
  role_requirements: string | null;
  buyer_title: string | null;
  
  // User/company fields
  user_company: string;
  user_title: string;
  user_mission: string;
  
  // Campaign settings
  industry: string;
  location: string;
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
  
  // Skills and experience
  experience_level: string | null;
  company_size: string | null;
  
  // Additional metadata (stored in pdl_search_params)
  additional_variables?: Record<string, string>;
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
   * Create a new outreach campaign
   */
  static async create(campaignData: CreateCampaignData): Promise<CampaignProfile | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          user_id: campaignData.user_id,
          name: campaignData.name,
          outreach_type: campaignData.outreach_type,
          role_title: campaignData.role_title || null,
          role_requirements: campaignData.role_requirements || null,
          buyer_title: campaignData.outreach_type === 'sales' ? campaignData.role_title : null, // buyer_title maps to role_title for sales
          user_company: campaignData.user_company,
          user_title: campaignData.user_title,
          user_mission: campaignData.user_mission,
          industry: campaignData.industry,
          location: campaignData.job_location || '',
          job_location: campaignData.job_location || null,
          salary_range: campaignData.salary_range || null,
          remote_ok: campaignData.remote_ok || false,
          target_emails: campaignData.target_emails || 50,
          experience_level: campaignData.experience_level || null,
          company_size: campaignData.company_size || null,
          status: 'draft',
          pdl_search_params: {
            // Store search-related data and additional variables
            specific_skills: campaignData.specific_skills,
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
        role_title: campaign.role_title || campaign.buyer_title || '',
        user_company: campaign.user_company,
        user_title: campaign.user_title,
        user_mission: campaign.user_mission,
        industry: campaign.industry,
        location: campaign.location,
        job_location: campaign.job_location || '',
        salary_range: campaign.salary_range || '',
        experience_level: campaign.experience_level || '',
        company_size: campaign.company_size || '',
        outreach_type: campaign.outreach_type,
      };

      // Add specific skills from pdl_search_params if available
      if (campaign.pdl_search_params?.specific_skills && Array.isArray(campaign.pdl_search_params.specific_skills)) {
        variables.required_skills = campaign.pdl_search_params.specific_skills.join(', ');
      }

      // Add any additional variables from pdl_search_params
      if (campaign.pdl_search_params?.additional_variables) {
        Object.assign(variables, campaign.pdl_search_params.additional_variables);
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
    user_company?: string;
    user_title?: string;
    user_mission?: string;
    industry?: string;
    location?: string;
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
      const titleToSearch = campaign.role_title || campaign.buyer_title;
      if (titleToSearch) {
        searchParams.required.push({
          field: "job_title",
          condition: "contains",
          value: titleToSearch
        });
      }

      // Add skills criteria from pdl_search_params
      if (campaign.pdl_search_params?.specific_skills && Array.isArray(campaign.pdl_search_params.specific_skills)) {
        searchParams.required.push({
          field: "skills",
          condition: "contains",
          value: campaign.pdl_search_params.specific_skills
        });
      }

      // Add industry criteria
      if (campaign.industry) {
        searchParams.required.push({
          field: "industry",
          condition: "contains",
          value: campaign.industry
        });
      }

      // Add location criteria
      if (campaign.location && campaign.location !== 'remote') {
        searchParams.required.push({
          field: "location_region",
          condition: "contains",
          value: campaign.location
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
      role_title: campaign.role_title || campaign.buyer_title || '',
      user_company: campaign.user_company,
      user_title: campaign.user_title,
      user_mission: campaign.user_mission,
      location: campaign.job_location || campaign.location || '',
      salary_range: campaign.salary_range || '',
      
      // Candidate variables
      name: candidate.full_name || '',
      skills: candidate.selected_skill || (candidate.skills && candidate.skills.length > 0 ? candidate.skills[0] : ''),
      current_company: candidate.current_company || '',
      current_title: candidate.current_title || '',
      candidate_location: candidate.location || '',
      experience_years: candidate.experience_years ? candidate.experience_years.toString() : '',
      
      // Additional variables from pdl_search_params
      ...(campaign.pdl_search_params?.additional_variables || {})
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