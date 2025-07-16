import { supabase } from '../config/database';
import { GmailTokens, GmailService } from './gmailService';

export class TokenManager {
  /**
   * Save Gmail tokens to database
   */
  static async saveGmailTokens(userId: string, tokens: GmailTokens): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          gmail_token: tokens.access_token,
          gmail_refresh_token: tokens.refresh_token,
          gmail_token_expires_at: new Date(tokens.expiry_date || Date.now() + 3600000) // Default 1 hour
        })
        .eq('id', userId);

      if (error) {
        console.error('Error saving Gmail tokens:', error);
        return false;
      }

      console.log(`[TokenManager] Tokens saved for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in saveGmailTokens:', error);
      return false;
    }
  }

  /**
   * Get current Gmail tokens from database
   */
  static async getGmailTokens(userId: string): Promise<GmailTokens | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('gmail_token, gmail_refresh_token, gmail_token_expires_at')
        .eq('id', userId)
        .single();
      
      if (error || !data?.gmail_token) {
        console.log(`[TokenManager] No Gmail tokens found for user ${userId}`);
        return null;
      }
      
      return {
        access_token: data.gmail_token,
        refresh_token: data.gmail_refresh_token,
        expiry_date: data.gmail_token_expires_at ? new Date(data.gmail_token_expires_at).getTime() : undefined
      };
    } catch (error) {
      console.error('Error getting Gmail tokens:', error);
      return null;
    }
  }

  /**
   * Get valid tokens (refresh if needed)
   */
  static async getValidTokens(userId: string): Promise<GmailTokens | null> {
    try {
      const tokens = await this.getGmailTokens(userId);
      if (!tokens) {
        console.log(`[TokenManager] No tokens found for user ${userId}`);
        return null;
      }

      // Check if token expires in next 5 minutes
      const expiresIn = (tokens.expiry_date || 0) - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresIn < fiveMinutes) {
        console.log(`[TokenManager] Token expires soon, refreshing for user ${userId}`);
        
        const refreshed = await GmailService.refreshTokens(tokens);
        if (refreshed) {
          const saved = await this.saveGmailTokens(userId, refreshed);
          if (saved) {
            console.log(`[TokenManager] Tokens refreshed and saved for user ${userId}`);
            return refreshed;
          }
        }
        
        console.error(`[TokenManager] Failed to refresh tokens for user ${userId}`);
        return null;
      }
      
      console.log(`[TokenManager] Valid tokens found for user ${userId}`);
      return tokens;
    } catch (error) {
      console.error('Error in getValidTokens:', error);
      return null;
    }
  }

  /**
   * Check if user has Gmail connected
   */
  static async hasGmailConnected(userId: string): Promise<boolean> {
    const tokens = await this.getGmailTokens(userId);
    return tokens !== null;
  }

  /**
   * Remove Gmail tokens (disconnect)
   */
  static async removeGmailTokens(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          gmail_token: null,
          gmail_refresh_token: null,
          gmail_token_expires_at: null
        })
        .eq('id', userId);

      if (error) {
        console.error('Error removing Gmail tokens:', error);
        return false;
      }

      console.log(`[TokenManager] Gmail tokens removed for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in removeGmailTokens:', error);
      return false;
    }
  }
}
