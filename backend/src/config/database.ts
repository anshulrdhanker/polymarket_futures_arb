import { createClient } from '@supabase/supabase-js';
import { DB_CONFIG } from './config';

export const supabase = createClient(DB_CONFIG.URL, DB_CONFIG.NAME);

// Test database connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Legacy functions for backwards compatibility
export const getUserByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
};

export const createUser = async (userData: { email: string; name: string }) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email,
        company_name: '', // Using your schema field name
        gmail_token: null,
        gmail_refresh_token: null,
        subscription_tier: 'free',
        campaigns_used_this_month: 0,
        billing_cycle_start: new Date().toISOString(),
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    return null;
  }
};
