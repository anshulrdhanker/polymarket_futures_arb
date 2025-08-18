import { supabase } from '../config/database';

export interface CreateCandidateData {
  campaign_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  current_company?: string | null;
  current_title?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  skills?: string[] | null;
  experience_years?: number | null;
  education?: any;
  pdl_profile_data?: any;
  selected_skill?: string | null;
  match_score?: number;
}

export interface CandidateProfile {
  id: string;
  campaign_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  current_company: string | null;
  current_title: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  skills: string[] | null;
  experience_years: number | null;
  education: any;
  pdl_profile_data: any;
  selected_skill: string | null;
  match_score: number | null;
  personalized_email: string | null;
  email_subject: string | null;
  sent_at: string | null;
  status: string;
  notes: string | null;
}

export interface CandidateStats {
  total_candidates: number;
  emails_sent: number;
  emails_pending: number;
  emails_bounced: number;
  emails_replied: number;
  emails_interested: number;
  response_rate: number;
  interest_rate: number;
}

export class Candidate {
  /**
   * Create a new candidate from PDL search results
   */
  static async create(candidateData: CreateCandidateData): Promise<CandidateProfile | null> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert([{
          campaign_id: candidateData.campaign_id,
          full_name: candidateData.full_name,
          email: candidateData.email ?? null,
          phone: candidateData.phone || null,
          current_company: candidateData.current_company || null,
          current_title: candidateData.current_title || null,
          location: candidateData.location || null,
          linkedin_url: candidateData.linkedin_url || null,
          github_url: candidateData.github_url || null,
          skills: candidateData.skills || null,
          experience_years: candidateData.experience_years || null,
          education: candidateData.education || null,
          pdl_profile_data: candidateData.pdl_profile_data || null,
          personalized_email: null,
          email_subject: null,
          sent_at: null,
          status: 'found',
          notes: null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating candidate:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in Candidate.create:', error);
      return null;
    }
  }

  /**
   * Create multiple candidates in batch
   */
  static async createBatch(candidatesData: CreateCandidateData[]): Promise<CandidateProfile[]> {
    try {
      const candidatesToInsert = candidatesData.map(candidateData => ({
        campaign_id: candidateData.campaign_id,
        full_name: candidateData.full_name,
        email: candidateData.email ?? null,
        phone: candidateData.phone || null,
        current_company: candidateData.current_company || null,
        current_title: candidateData.current_title || null,
        location: candidateData.location || null,
        linkedin_url: candidateData.linkedin_url || null,
        github_url: candidateData.github_url || null,
        skills: candidateData.skills || null,
        experience_years: candidateData.experience_years || null,
        education: candidateData.education || null,
        pdl_profile_data: candidateData.pdl_profile_data || null,
        personalized_email: null,
        email_subject: null,
        sent_at: null,
        status: 'found',
        notes: null,
      }));

      const { data, error } = await supabase
        .from('candidates')
        .insert(candidatesToInsert)
        .select();

      if (error) {
        console.error('Error creating candidates batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Candidate.createBatch:', error);
      return [];
    }
  }

  /**
   * Find candidate by ID
   */
  static async findById(candidateId: string): Promise<CandidateProfile | null> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in Candidate.findById:', error);
      return null;
    }
  }

  /**
   * Get all candidates for a campaign
   */
  static async findByCampaignId(campaignId: string, limit: number = 100): Promise<CandidateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('full_name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching campaign candidates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Candidate.findByCampaignId:', error);
      return [];
    }
  }

  /**
   * Get candidates by status
   */
  static async findByStatus(campaignId: string, status: string): Promise<CandidateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', status)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching candidates by status:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Candidate.findByStatus:', error);
      return [];
    }
  }

  /**
   * Get candidates ready for email (found status, no email sent yet)
   */
  static async getReadyForEmail(campaignId: string, limit: number = 50): Promise<CandidateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'found')
        .is('sent_at', null)
        .order('full_name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching candidates ready for email:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Candidate.getReadyForEmail:', error);
      return [];
    }
  }

  /**
   * Update candidate status
   */
  static async updateStatus(candidateId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status })
        .eq('id', candidateId);

      if (error) {
        console.error('Error updating candidate status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.updateStatus:', error);
      return false;
    }
  }

  /**
   * Set personalized email content
   */
  static async setEmailContent(candidateId: string, subject: string, email: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          email_subject: subject,
          personalized_email: email,
        })
        .eq('id', candidateId);

      if (error) {
        console.error('Error setting email content:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.setEmailContent:', error);
      return false;
    }
  }

  /**
   * Mark email as sent
   */
  static async markEmailSent(candidateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          status: 'emailed',
          sent_at: new Date().toISOString(),
        })
        .eq('id', candidateId);

      if (error) {
        console.error('Error marking email as sent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.markEmailSent:', error);
      return false;
    }
  }

  /**
   * Mark email as bounced
   */
  static async markEmailBounced(candidateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          status: 'bounced',
        })
        .eq('id', candidateId);

      if (error) {
        console.error('Error marking email as bounced:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.markEmailBounced:', error);
      return false;
    }
  }

  /**
   * Mark candidate as replied
   */
  static async markReplied(candidateId: string, interested: boolean = false): Promise<boolean> {
    try {
      const status = interested ? 'interested' : 'replied';
      
      const { error } = await supabase
        .from('candidates')
        .update({ status })
        .eq('id', candidateId);

      if (error) {
        console.error('Error marking candidate as replied:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.markReplied:', error);
      return false;
    }
  }

  /**
   * Add notes to candidate
   */
  static async addNotes(candidateId: string, notes: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ notes })
        .eq('id', candidateId);

      if (error) {
        console.error('Error adding notes to candidate:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.addNotes:', error);
      return false;
    }
  }

  /**
   * Get candidate statistics for a campaign
   */
  static async getStatsForCampaign(campaignId: string): Promise<CandidateStats> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('status, sent_at')
        .eq('campaign_id', campaignId);

      if (error || !data) {
        console.error('Error fetching candidate stats:', error);
        return this.getEmptyStats();
      }

      const stats = data.reduce((acc, candidate) => {
        acc.total_candidates += 1;
        
        if (candidate.sent_at) {
          acc.emails_sent += 1;
        } else if (candidate.status === 'found') {
          acc.emails_pending += 1;
        }

        if (candidate.status === 'bounced') acc.emails_bounced += 1;
        if (candidate.status === 'replied' || candidate.status === 'interested') {
          acc.emails_replied += 1;
        }
        if (candidate.status === 'interested') acc.emails_interested += 1;

        return acc;
      }, this.getEmptyStats());

      // Calculate rates
      stats.response_rate = stats.emails_sent > 0 
        ? (stats.emails_replied / stats.emails_sent) * 100 
        : 0;
      
      stats.interest_rate = stats.emails_replied > 0 
        ? (stats.emails_interested / stats.emails_replied) * 100 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error in Candidate.getStatsForCampaign:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Check if candidate email already exists in campaign
   */
  static async emailExistsInCampaign(campaignId: string, email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking email existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in Candidate.emailExistsInCampaign:', error);
      return false;
    }
  }

  /**
   * Delete candidate
   */
  static async delete(candidateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) {
        console.error('Error deleting candidate:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Candidate.delete:', error);
      return false;
    }
  }

  /**
   * Search candidates by name or company
   */
  static async search(campaignId: string, query: string): Promise<CandidateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .or(`full_name.ilike.%${query}%,current_company.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error searching candidates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in Candidate.search:', error);
      return [];
    }
  }

  /**
   * Helper to get empty stats object
   */
  private static getEmptyStats(): CandidateStats {
    return {
      total_candidates: 0,
      emails_sent: 0,
      emails_pending: 0,
      emails_bounced: 0,
      emails_replied: 0,
      emails_interested: 0,
      response_rate: 0,
      interest_rate: 0,
    };
  }
}