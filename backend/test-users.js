const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://wuoixzhwqgxphmyeyvrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1b2l4emh3cWd4cGhteWV5dnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5ODM2ODgsImV4cCI6MjA2NjU1OTY4OH0.cwFPgK2gG3d63zO8Sskq9Fk8WSzjw_raPKACdzvBiKo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection to your tables...');
  
  try {
    // Test 1: Try to read from users table
    console.log('\n🔍 Testing read from users table...');
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(2); // Just get a couple of records
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to users table!');
    
    if (users && users.length > 0) {
      console.log('Sample user data:', users);
    } else {
      console.log('No users found in the database.');
    }

  } catch (error) {
    console.error('❌ Error testing connection:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
  }
}

testConnection();
