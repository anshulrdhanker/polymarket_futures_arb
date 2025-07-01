import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Gmail OAuth2 client setup
export const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Gmail API scopes needed for sending email
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Generate Gmail OAuth authorization URL
 */
export const getGmailAuthUrl = (): string => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    include_granted_scopes: true,
    prompt: 'consent', // Forces refresh token generation
  });
};

/**
 * Exchange authorization code for tokens
 */
export const getGmailTokens = async (code: string) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting Gmail tokens:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

/**
 * Set credentials for OAuth2 client
 */
export const setGmailCredentials = (tokens: any) => {
  oauth2Client.setCredentials(tokens);
};

/**
 * Refresh Gmail access token
 */
export const refreshGmailToken = async (refreshToken: string) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing Gmail token:', error);
    throw new Error('Failed to refresh Gmail token');
  }
};

/**
 * Get Gmail API client with user credentials
 */
export const getGmailClient = (accessToken: string, refreshToken: string) => {
  const authClient = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  authClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: 'v1', auth: authClient });
};

/**
 * Validate Gmail tokens are still valid
 */
export const validateGmailTokens = async (accessToken: string): Promise<boolean> => {
  try {
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    // Try to get user profile to validate token
    await gmail.users.getProfile({ userId: 'me' });
    return true;
  } catch (error) {
    console.error('Gmail tokens invalid:', error);
    return false;
  }
};

/**
 * Get user email from Gmail API
 */
export const getGmailUserEmail = async (accessToken: string): Promise<string | null> => {
  try {
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: authClient });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    return profile.data.emailAddress || null;
  } catch (error) {
    console.error('Error getting Gmail user email:', error);
    return null;
  }
};

/**
 * Revoke Gmail tokens (disconnect)
 */
export const revokeGmailTokens = async (accessToken: string): Promise<boolean> => {
  try {
    await oauth2Client.revokeToken(accessToken);
    return true;
  } catch (error) {
    console.error('Error revoking Gmail tokens:', error);
    return false;
  }
};

export default oauth2Client;
