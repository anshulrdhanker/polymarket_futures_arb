import { supabase } from '../config/database';

export interface CreateUserData {
  email: string;
  company_name?: string;
  subscription_tier?: 'free' | 'basic' | 'pro' | 'enterprise';
  user_full_name?: string;
  default_recruiter_title?: string;
  default_company_mission?: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  gmail_token: string | null;
  gmail_refresh_token: string | null;
  subscription_tier: string;
  campaigns_used_this_month: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  // Profile data for email variables
  user_full_name: string | null;
  default_recruiter_title: string | null;
  default_company_mission: string | null;
  // Email rate limiting
  emails_sent_today: number;
  last_email_date: string | null;
}

export class User {
  /**
   * Create a new recruiter user
   */
  static async create(userData: CreateUserData): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          company_name: userData.company_name || '',
          gmail_token: null,
          gmail_refresh_token: null,
          subscription_tier: userData.subscription_tier || 'free',
          campaigns_used_this_month: 0,
          billing_cycle_start: new Date().toISOString(),
          stripe_customer_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Profile data for email variables
          user_full_name: userData.user_full_name || null,
          default_recruiter_title: userData.default_recruiter_title || null,
          default_company_mission: userData.default_company_mission || null,
          // Email rate limiting
          emails_sent_today: 0,
          last_email_date: null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in User.create:', error);
      return null;
    }
  }

  /**
   * Find user by email address
   */
  static async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in User.findByEmail:', error);
      return null;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in User.findById:', error);
      return null;
    }
  }

  /**
   * Update Gmail OAuth tokens for user
   */
  static async updateGmailTokens(userId: string, tokens: GmailTokens): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          gmail_token: tokens.access_token,
          gmail_refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating Gmail tokens:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.updateGmailTokens:', error);
      return false;
    }
  }

  /**
   * Update subscription tier
   */
  static async updateSubscription(userId: string, tier: 'free' | 'basic' | 'pro' | 'enterprise'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.updateSubscription:', error);
      return false;
    }
  }

  /**
   * Get user's Gmail tokens for API calls
   */
  static async getGmailTokens(userId: string): Promise<{ access_token: string; refresh_token: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('gmail_token, gmail_refresh_token')
        .eq('id', userId)
        .single();

      if (error || !data?.gmail_token) {
        return null;
      }

      return {
        access_token: data.gmail_token,
        refresh_token: data.gmail_refresh_token,
      };
    } catch (error) {
      console.error('Error in User.getGmailTokens:', error);
      return null;
    }
  }

  /**
   * Get user defaults for campaign creation
   */
  static async getUserDefaults(userId: string): Promise<{
    recruiter_name: string;
    recruiter_company: string;
    recruiter_title: string;
    recruiter_mission: string;
  } | null> {
    try {
      const user = await this.findById(userId);
      if (!user) return null;

      return {
        recruiter_name: user.user_full_name || '',
        recruiter_company: user.company_name || '',
        recruiter_title: user.default_recruiter_title || '',
        recruiter_mission: user.default_company_mission || '',
      };
    } catch (error) {
      console.error('Error in User.getUserDefaults:', error);
      return null;
    }
  }

  /**
   * Update user profile data
   */
  static async updateProfile(userId: string, profileData: {
    user_full_name?: string;
    company_name?: string;
    default_recruiter_title?: string;
    default_company_mission?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.updateProfile:', error);
      return false;
    }
  }

  /**
   * Check daily email sending limits
   */
  static async canSendEmail(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      const today = new Date().toISOString().split('T')[0];
      const userEmailDate = user.last_email_date ? user.last_email_date.split('T')[0] : null;

      // If it's a new day, user can send emails
      if (userEmailDate !== today) {
        return true;
      }

      // Check daily limits based on subscription tier
      const dailyLimits = this.getDailyEmailLimits(user.subscription_tier);
      return user.emails_sent_today < dailyLimits;
    } catch (error) {
      console.error('Error in User.canSendEmail:', error);
      return false;
    }
  }

  /**
   * Increment daily email count
   */
  static async incrementDailyEmailCount(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      const today = new Date().toISOString();
      const todayDate = today.split('T')[0];
      const userEmailDate = user.last_email_date ? user.last_email_date.split('T')[0] : null;

      let emailsToday = user.emails_sent_today;

      // Reset count if it's a new day
      if (userEmailDate !== todayDate) {
        emailsToday = 0;
      }

      const { error } = await supabase
        .from('users')
        .update({
          emails_sent_today: emailsToday + 1,
          last_email_date: today,
          updated_at: today,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error incrementing daily email count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.incrementDailyEmailCount:', error);
      return false;
    }
  }

  /**
   * Get daily email sending stats
   */
  static async getDailyEmailStats(userId: string): Promise<{
    sent_today: number;
    daily_limit: number;
    remaining: number;
  } | null> {
    try {
      const user = await this.findById(userId);
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      const userEmailDate = user.last_email_date ? user.last_email_date.split('T')[0] : null;

      const sentToday = userEmailDate === today ? user.emails_sent_today : 0;
      const dailyLimit = this.getDailyEmailLimits(user.subscription_tier);

      return {
        sent_today: sentToday,
        daily_limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - sentToday),
      };
    } catch (error) {
      console.error('Error in User.getDailyEmailStats:', error);
      return null;
    }
  }

  /**
   * Reset daily email count (called by cron job at midnight)
   */
  static async resetDailyEmailCounts(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          emails_sent_today: 0,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error resetting daily email counts:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.resetDailyEmailCounts:', error);
      return false;
    }
  }

  /**
   * Check if user can create more campaigns this month
   */
  static async canCreateCampaign(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      const maxCampaigns = this.getMaxCampaigns(user.subscription_tier);
      return user.campaigns_used_this_month < maxCampaigns;
    } catch (error) {
      console.error('Error in User.canCreateCampaign:', error);
      return false;
    }
  }

  /**
   * Increment campaign usage counter
   */
  static async incrementCampaignUsage(userId: string): Promise<boolean> {
    try {
      // First get current value
      const user = await this.findById(userId);
      if (!user) return false;

      // Then update with incremented value
      const { error } = await supabase
        .from('users')
        .update({
          campaigns_used_this_month: user.campaigns_used_this_month + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error incrementing campaign usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.incrementCampaignUsage:', error);
      return false;
    }
  }

  /**
   * Reset monthly campaign usage (called by cron job)
   */
  static async resetMonthlyCampaignUsage(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          campaigns_used_this_month: 0,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error resetting monthly usage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.resetMonthlyCampaignUsage:', error);
      return false;
    }
  }

  /**
   * Get maximum campaigns allowed per tier
   */
  private static getMaxCampaigns(tier: string): number {
    const limits = {
      free: 2,
      basic: 10,
      pro: 50,
      enterprise: 200,
    };
    return limits[tier as keyof typeof limits] || limits.free;
  }

  /**
   * Get daily email limits per tier
   */
  private static getDailyEmailLimits(tier: string): number {
    const limits = {
      free: 50,      // 50 emails per day
      basic: 200,    // 200 emails per day  
      pro: 500,      // 500 emails per day
      enterprise: 1000, // 1000 emails per day
    };
    return limits[tier as keyof typeof limits] || limits.free;
  }

  /**
   * Disconnect Gmail account
   */
  static async disconnectGmail(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          gmail_token: null,
          gmail_refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error disconnecting Gmail:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in User.disconnectGmail:', error);
      return false;
    }
  }
}