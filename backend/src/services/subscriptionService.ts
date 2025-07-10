import { User } from '../models/User';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Pricing tiers
export const PRICING_TIERS = {
  ONE_CAMPAIGN: {
    name: '1 Campaign',
    price: 129,
    campaigns: 1,
    stripe_price_id: 'price_1campaign', // You'll get this from Stripe
  },
  THREE_CAMPAIGNS: {
    name: '3 Campaigns', 
    price: 349,
    campaigns: 3,
    stripe_price_id: 'price_3campaigns',
  },
  FIVE_CAMPAIGNS: {
    name: '5 Campaigns',
    price: 499, 
    campaigns: 5,
    stripe_price_id: 'price_5campaigns',
  }
};

export interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export class SubscriptionService {
  /**
   * Check if user can create more campaigns
   */
  static async checkCampaignLimits(userId: string): Promise<{
    canCreate: boolean;
    remainingCampaigns: number;
    needsToPurchase: boolean;
    isEnterprise: boolean;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Enterprise users have unlimited campaigns
      if (user.is_enterprise) {
        return {
          canCreate: true,
          remainingCampaigns: 999,
          needsToPurchase: false,
          isEnterprise: true
        };
      }

      // Regular users check campaign balance
      const remainingCampaigns = user.campaigns_remaining || 0;
      
      return {
        canCreate: remainingCampaigns > 0,
        remainingCampaigns,
        needsToPurchase: remainingCampaigns === 0,
        isEnterprise: false
      };

    } catch (error) {
      console.error('Error checking campaign limits:', error);
      throw new Error('Failed to check campaign limits');
    }
  }

  /**
   * Handle successful campaign purchase
   */
  static async handleCampaignPurchase(
    userId: string, 
    campaignsCount: number,
    stripeSessionId?: string
  ): Promise<void> {
    try {
      console.log(`[Subscription] Adding ${campaignsCount} campaigns to user ${userId}`);
      
      await User.addCampaigns(userId, campaignsCount);
      
      console.log(`[Subscription] Successfully added ${campaignsCount} campaigns`);
      
    } catch (error) {
      console.error('Error handling campaign purchase:', error);
      throw new Error('Failed to process campaign purchase');
    }
  }

  /**
   * Use one campaign credit
   */
  static async useCampaign(userId: string): Promise<boolean> {
    try {
      const limits = await this.checkCampaignLimits(userId);
      
      if (!limits.canCreate) {
        console.warn(`[Subscription] User ${userId} tried to create campaign but has no remaining credits`);
        return false;
      }

      await User.useCampaign(userId);
      console.log(`[Subscription] Used 1 campaign credit for user ${userId}`);
      
      return true;
      
    } catch (error) {
      console.error('Error using campaign credit:', error);
      return false;
    }
  }

  /**
   * Create Stripe checkout session for campaign purchase
   */
  static async createCheckoutSession(
    userId: string,
    campaignPackage: keyof typeof PRICING_TIERS,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const tier = PRICING_TIERS[campaignPackage];
      if (!tier) {
        throw new Error('Invalid campaign package');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create or get Stripe customer
      let customerId = user.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId
          }
        });
        customerId = customer.id;
        await User.updateStripeCustomerId(userId, customerId);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tier.name,
                description: `${tier.campaigns} executive recruiting campaigns`,
              },
              unit_amount: tier.price * 100, // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          campaignPackage: campaignPackage,
          campaignsCount: tier.campaigns.toString()
        }
      });

      return session.url!;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Handle Stripe webhooks
   */
  static async handleStripeWebhook(event: StripeEvent): Promise<void> {
    try {
      console.log(`[Subscription] Processing Stripe webhook: ${event.type}`);
      
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
          
        case 'payment_intent.succeeded':
          console.log('[Subscription] Payment succeeded');
          break;
          
        case 'payment_intent.payment_failed':
          console.log('[Subscription] Payment failed');
          break;
          
        default:
          console.log(`[Subscription] Unhandled webhook type: ${event.type}`);
      }
      
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }

  /**
   * Handle completed checkout session
   */
  private static async handleCheckoutCompleted(session: any): Promise<void> {
    try {
      const { userId, campaignsCount } = session.metadata;
      
      if (!userId || !campaignsCount) {
        throw new Error('Missing metadata in checkout session');
      }

      await this.handleCampaignPurchase(
        userId,
        parseInt(campaignsCount),
        session.id
      );
      
      console.log(`[Subscription] Checkout completed for user ${userId}: +${campaignsCount} campaigns`);
      
    } catch (error) {
      console.error('Error handling checkout completion:', error);
      throw error;
    }
  }

  /**
   * Get user's subscription status
   */
  static async getUserSubscriptionStatus(userId: string): Promise<{
    campaignsPurchased: number;
    campaignsUsed: number;
    campaignsRemaining: number;
    isEnterprise: boolean;
    lastPurchaseDate: string | null;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        campaignsPurchased: user.campaigns_purchased || 0,
        campaignsUsed: user.campaigns_used || 0,
        campaignsRemaining: user.campaigns_remaining || 0,
        isEnterprise: user.is_enterprise || false,
        lastPurchaseDate: user.last_purchase_date
      };
      
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }
}
