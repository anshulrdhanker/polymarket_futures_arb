import { Request, Response, Router } from 'express';
import { 
  getGmailAuthUrl, 
  getGmailTokens, 
  refreshGmailToken, 
  getGmailUserEmail,
  revokeGmailTokens 
} from '../config/gmail';

// Import the User model
import { User } from '../models/User';

const router = Router();

// Define interfaces for request bodies
interface GmailAuthRequest extends Request {
  body: {
    userId: string;
  };
}

interface RefreshTokenRequest extends Request {
  body: {
    userId: string;
  };
}

interface LogoutRequest extends Request {
  body: {
    userId: string;
  };
}

interface StatusRequest extends Request {
  query: {
    userId: string;
  };
}

/**
 * POST /auth/gmail - Start Gmail OAuth flow
 * Returns authorization URL for user to visit
 */
// @ts-ignore - Ignore type checking for this line
router.post('/gmail', async (req: GmailAuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Generate Gmail OAuth URL
    const authUrl = getGmailAuthUrl();

    res.json({
      authUrl,
      message: 'Visit the authorization URL to connect your Gmail account',
    });
  } catch (error) {
    console.error('Error starting Gmail OAuth:', error);
    res.status(500).json({
      error: 'Failed to start Gmail OAuth flow',
    });
  }
});

/**
 * GET /auth/callback - Handle Gmail OAuth callback
 * Exchanges authorization code for tokens and stores them
 */
// @ts-ignore - Ignore type checking for this line
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code is required',
      });
    }

    // Exchange code for tokens
    const tokens = await getGmailTokens(code as string);

    if (!tokens.access_token || !tokens.refresh_token) {
      return res.status(400).json({
        error: 'Failed to obtain valid tokens',
      });
    }

    // Get user email from Gmail to verify connection
    const userEmail = await getGmailUserEmail(tokens.access_token);

    if (!userEmail) {
      return res.status(400).json({
        error: 'Failed to verify Gmail account',
      });
    }

    // Find user by email (assuming they signed up with the same email)
    const user = await User.findByEmail(userEmail);

    if (!user) {
      return res.status(404).json({
        error: 'No user found with this Gmail address. Please sign up first.',
      });
    }

    // Store tokens in database
    const tokensStored = await User.updateGmailTokens(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600000, // 1 hour default
    });

    if (!tokensStored) {
      return res.status(500).json({
        error: 'Failed to store Gmail tokens',
      });
    }

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/success?gmail=connected`);

  } catch (error) {
    console.error('Error handling Gmail callback:', error);
    
    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/error?reason=gmail_connection_failed`);
  }
});

/**
 * POST /auth/refresh - Refresh Gmail access token
 * Uses refresh token to get new access token
 */
// @ts-ignore - Ignore type checking for this line
router.post('/refresh', async (req: RefreshTokenRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    // Get user's current tokens
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    if (!user.gmail_refresh_token) {
      return res.status(400).json({
        error: 'No refresh token found. Please reconnect your Gmail account.',
      });
    }

    // Refresh the access token
    const newTokens = await refreshGmailToken(user.gmail_refresh_token);

    if (!newTokens.access_token) {
      return res.status(400).json({
        error: 'Failed to refresh access token',
      });
    }

    // Update tokens in database
    const tokensUpdated = await User.updateGmailTokens(userId, {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || user.gmail_refresh_token,
      scope: newTokens.scope || '',
      token_type: newTokens.token_type || 'Bearer',
      expiry_date: newTokens.expiry_date || Date.now() + 3600000,
    });

    if (!tokensUpdated) {
      return res.status(500).json({
        error: 'Failed to update Gmail tokens',
      });
    }

    res.json({
      message: 'Gmail tokens refreshed successfully',
      expires_at: new Date(newTokens.expiry_date || Date.now() + 3600000).toISOString(),
    });

  } catch (error) {
    console.error('Error refreshing Gmail tokens:', error);
    res.status(500).json({
      error: 'Failed to refresh Gmail tokens',
    });
  }
});

/**
 * DELETE /auth/logout - Remove Gmail connection
 * Revokes tokens and removes them from database
 */
// @ts-ignore - Ignore type checking for this line
router.delete('/logout', async (req: LogoutRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    // Get user's current tokens
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Revoke tokens with Google (optional but recommended)
    if (user.gmail_token) {
      try {
        await revokeGmailTokens(user.gmail_token);
      } catch (error) {
        console.error('Error revoking tokens with Google:', error);
        // Continue with local removal even if Google revocation fails
      }
    }

    // Remove tokens from database
    const tokensRemoved = await User.disconnectGmail(userId);

    if (!tokensRemoved) {
      return res.status(500).json({
        error: 'Failed to remove Gmail connection',
      });
    }

    res.json({
      message: 'Gmail account disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({
      error: 'Failed to disconnect Gmail account',
    });
  }
});

/**
 * GET /auth/status - Check Gmail connection status
 * Returns whether user has Gmail connected and basic info
 */
// @ts-ignore - Ignore type checking for this line
router.get('/status', async (req: StatusRequest, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
      });
    }

    const user = await User.findById(userId as string);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const isGmailConnected = !!(user.gmail_token && user.gmail_refresh_token);

    res.json({
      gmail_connected: isGmailConnected,
      user_email: user.email,
      ...(isGmailConnected && {
        connection_status: 'active',
        last_updated: user.updated_at,
      }),
    });

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
    });
  }
});

export default router;
