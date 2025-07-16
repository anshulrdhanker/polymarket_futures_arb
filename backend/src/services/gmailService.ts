import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenManager } from './tokenManager';

// Types for Gmail integration
export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export interface Candidate {
  full_name: string;
  email: string;
  current_title?: string;
  current_company?: string;
  skills?: string[];
  location?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
}

export class GmailService {
  /**
   * Create authenticated Gmail client
   */
  private static createGmailClient(userTokens: GmailTokens): any {
    const oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // Set user's tokens
    oauth2Client.setCredentials({
      access_token: userTokens.access_token,
      refresh_token: userTokens.refresh_token,
      token_type: userTokens.token_type || 'Bearer',
      expiry_date: userTokens.expiry_date,
    });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    return { gmail, oauth2Client };
  }

  /**
   * Compose email in RFC2822 format
   */
  private static composeEmail(
    to: string,
    from: string,
    subject: string,
    body: string
  ): string {
    const messageParts = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '', // Empty line to separate headers from body
      body
    ];

    const message = messageParts.join('\n');
    
    // Encode in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * Send recruiting email via Gmail API
   */
  /**
   * Send recruiting email via Gmail API (using userId instead of tokens)
   */
  static async sendRecruitingEmail(
    userId: string,  // ← Changed from userTokens parameter
    candidate: Candidate,
    subject: string,
    body: string,
    senderEmail?: string
  ): Promise<EmailResult> {
    try {
      // Get valid tokens from database
      const userTokens = await TokenManager.getValidTokens(userId);
      if (!userTokens) {
        return {
          success: false,
          error: 'No valid Gmail tokens found. Please reconnect your Gmail account.'
        };
      }

      // Rest of your existing code stays the same...
      // Just replace the userTokens parameter usage with the userTokens variable we just got
      
      // Validate inputs
      if (!candidate.email) {
        return {
          success: false,
          error: 'Candidate email is required'
        };
      }

      // Create Gmail client
      const { gmail, oauth2Client } = this.createGmailClient(userTokens);

      // Get sender email if not provided
      let fromEmail = senderEmail;
      if (!fromEmail) {
        try {
          const profile = await gmail.users.getProfile({ userId: 'me' });
          fromEmail = profile.data.emailAddress;
        } catch (profileError) {
          console.error('Failed to get user email:', profileError);
          return {
            success: false,
            error: 'Failed to get sender email address'
          };
        }
      }

      // Compose email
      const rawMessage = this.composeEmail(
        candidate.email,
        fromEmail!,
        subject,
        body
      );

      // Send email
      console.log(`[Gmail] Sending email to ${candidate.email}`);
      
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      console.log(`[Gmail] Email sent successfully to ${candidate.email}, messageId: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
      };

    } catch (error: any) {
      console.error(`[Gmail] Error sending email to ${candidate.email}:`, error);

      // Handle specific error types
      if (error.code === 429 || error.message?.includes('rate limit')) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true
        };
      }

      if (error.code === 401 || error.message?.includes('unauthorized')) {
        return {
          success: false,
          error: 'Gmail authentication failed - tokens may be expired'
        };
      }

      if (error.code === 403) {
        return {
          success: false,
          error: 'Gmail API access denied - check permissions'
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error sending email'
      };
    }
  }

  /**
   * Send multiple emails with rate limiting (using userId)
   */
  static async sendBulkRecruitingEmails(
    userId: string,  // ← Changed from userTokens parameter
    emailJobs: Array<{
      candidate: Candidate;
      subject: string;
      body: string;
    }>,
    delayBetweenEmails: number = 1000
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (let i = 0; i < emailJobs.length; i++) {
      const job = emailJobs[i];
      
      console.log(`[Gmail] Sending email ${i + 1}/${emailJobs.length} to ${job.candidate.email}`);
      
      const result = await this.sendRecruitingEmail(
        userId,  // ← Changed from userTokens
        job.candidate,
        job.subject,
        job.body
      );
      
      results.push(result);
      
      // Handle rate limiting
      if (result.rateLimited) {
        console.warn(`[Gmail] Rate limited, waiting 60 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else if (i < emailJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
      }
    }
    
    return results;
  }

  /**
   * Validate Gmail tokens are still valid
   */
  static async validateTokens(userTokens: GmailTokens): Promise<boolean> {
    try {
      const { gmail } = this.createGmailClient(userTokens);
      await gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      console.error('[Gmail] Token validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh expired tokens
   */
  static async refreshTokens(userTokens: GmailTokens): Promise<GmailTokens | null> {
    try {
      const oauth2Client = new OAuth2Client(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: userTokens.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || userTokens.refresh_token,
        token_type: credentials.token_type || undefined,  // Handle null case
        expiry_date: credentials.expiry_date || undefined, // Handle null case
      };
    } catch (error) {
      console.error('[Gmail] Failed to refresh tokens:', error);
      return null;
    }
  }
}
