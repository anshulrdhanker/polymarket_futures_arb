// File: scripts/test-pdl-improved.ts
import dotenv from 'dotenv';
import path from 'path';
import { PDLService, Candidate, PDLQuery } from '../src/services/pdlService';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runImprovedPDLTests() {
  console.log('🔍 Starting Improved PDL Service Tests\n');

  // Test 1: PDL Connection
  await testPDLConnection();
  await delay(7000); // Wait 7 seconds between requests

  // Test 2: Debug Raw Response
  await testRawResponse();
  await delay(7000);

  // Test 3: Broad Search
  await testBroadSearch();
  await delay(7000);

  // Test 4: Check for work_email availability
  await testEmailAvailability();

  console.log('\n🎉 Improved PDL tests completed!');
}

async function testPDLConnection() {
  console.log('🔌 Test 1: PDL API Connection');
  console.log('=============================');
  
  try {
    const isConnected = await PDLService.testConnection();
    
    if (isConnected) {
      console.log('✅ Successfully connected to PDL API!');
    } else {
      console.log('❌ Failed to connect to PDL API');
    }
  } catch (error) {
    console.error('❌ Error testing PDL connection:', error);
  }
  
  console.log('');
}

async function testRawResponse() {
  console.log('🔍 Test 2: Debug Raw API Response');
  console.log('==================================');
  
  try {
    console.log('🎯 Making raw API call to see actual response...');
    
    // Make direct API call to see raw response
    const response = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.PDL_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          match: {
            job_title: 'engineer'
          }
        },
        size: 2,
        data_include: 'full_name,first_name,work_email,job_title,job_company_name'
      })
    });

    const data = await response.json();
    
    console.log('Raw API Response:');
    console.log('Status:', data.status);
    console.log('Total:', data.total);
    console.log('Data length:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\nFirst candidate raw data:');
      console.log(JSON.stringify(data.data[0], null, 2));
      
      // Check what fields are actually available
      const firstCandidate = data.data[0];
      console.log('\nAvailable fields in response:');
      Object.keys(firstCandidate).forEach(key => {
        const value = firstCandidate[key];
        console.log(`  ${key}: ${typeof value === 'boolean' ? value : (value ? 'HAS_VALUE' : 'null')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing raw response:', error);
  }
  
  console.log('');
}

async function testBroadSearch() {
  console.log('🔍 Test 3: Broad Search (Any Engineer)');
  console.log('======================================');
  
  try {
    const testQuery: PDLQuery = {
      job_title: ['engineer']
      // No other filters - as broad as possible
    };

    console.log('🎯 Searching for any engineers...');
    console.log('Query:', testQuery);
    
    const candidates = await PDLService.searchCandidates(testQuery, 2);
    
    console.log(`✅ Found ${candidates.length} valid candidates (with email):`);
    
    candidates.forEach((candidate, index) => {
      console.log(`\n--- Candidate ${index + 1} ---`);
      console.log(`Name: ${candidate.first_name}`);
      console.log(`Email: ${candidate.work_email}`);
      console.log(`Title: ${candidate.job_title || 'Not specified'}`);
      console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
    });
    
    if (candidates.length === 0) {
      console.log('❌ No candidates found with work_email. This suggests:');
      console.log('   1. work_email field might not be available in free tier');
      console.log('   2. Field name might be different (email, emails, etc.)');
      console.log('   3. Most candidates might not have work emails in the dataset');
    }
    
  } catch (error) {
    console.error('❌ Error testing broad search:', error);
  }
  
  console.log('');
}

async function testEmailAvailability() {
  console.log('📧 Test 4: Check Email Field Availability');
  console.log('=========================================');
  
  try {
    console.log('🎯 Testing different email field names...');
    
    const response = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.PDL_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          match: {
            job_title: 'engineer'
          }
        },
        size: 3,
        data_include: 'full_name,first_name,work_email,emails,personal_emails,recommended_personal_email,job_title'
      })
    });

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log('✅ Checking email field availability:');
      
      data.data.forEach((candidate: any, index: number) => {
        console.log(`\n--- Candidate ${index + 1} ---`);
        console.log(`Name: ${candidate.full_name || candidate.first_name}`);
        console.log(`work_email: ${candidate.work_email || 'null'}`);
        console.log(`emails: ${candidate.emails || 'null'}`);
        console.log(`personal_emails: ${candidate.personal_emails || 'null'}`);
        console.log(`recommended_personal_email: ${candidate.recommended_personal_email || 'null'}`);
      });
      
      // Count how many have any kind of email
      const withWorkEmail = data.data.filter((c: any) => c.work_email).length;
      const withEmails = data.data.filter((c: any) => c.emails).length;
      const withPersonalEmails = data.data.filter((c: any) => c.personal_emails).length;
      const withRecommendedEmail = data.data.filter((c: any) => c.recommended_personal_email).length;
      
      console.log('\n📊 Email availability stats:');
      console.log(`work_email: ${withWorkEmail}/${data.data.length}`);
      console.log(`emails: ${withEmails}/${data.data.length}`);
      console.log(`personal_emails: ${withPersonalEmails}/${data.data.length}`);
      console.log(`recommended_personal_email: ${withRecommendedEmail}/${data.data.length}`);
      
    }
    
  } catch (error) {
    console.error('❌ Error testing email availability:', error);
  }
  
  console.log('');
}

// Run the tests
runImprovedPDLTests().catch(console.error);
