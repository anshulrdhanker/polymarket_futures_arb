import { supabase } from '../src/config/database';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection by querying the email_templates table
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('Available tables sample:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();
