const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://wuoixzhwqgxphmyeyvrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1b2l4emh3cWd4cGhteWV5dnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5ODM2ODgsImV4cCI6MjA2NjU1OTY4OH0.cwFPgK2gG3d63zO8Sskq9Fk8WSzjw_raPKACdzvBiKo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function countTemplates() {
  console.log('Counting email templates in database...');
  
  try {
    // First, get the total count
    const { count, error: countError } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    console.log(`\n📊 Total email templates in database: ${count}`);
    
    // Now get all template names and IDs
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('id, template_name, is_active')
      .order('template_name', { ascending: true });
    
    if (error) throw error;
    
    console.log('\n📋 List of all templates:');
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.template_name} (ID: ${template.id}) - ${template.is_active ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    console.error('❌ Error counting templates:', error.message);
    if (error.details) console.error('Details:', error.details);
  }
}

countTemplates();
