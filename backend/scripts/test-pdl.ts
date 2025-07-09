// File: scripts/test-pdl.ts
import dotenv from 'dotenv';
import path from 'path';
import { PDLService, Candidate, PDLQuery } from '../src/services/pdlService';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runPDLTests() {
  console.log('🔍 Starting PDL Service Tests (Updated Logic)\n');

  // Test 1: PDL Connection
  await testPDLConnection();

  // Test 2: Simple Search
  await testSimpleSearch();

  // Test 3: Skills-focused Search
  await testSkillsSearch();

  // Test 4: Conversation Data Search
  await testConversationSearch();

  console.log('\n🎉 PDL tests completed!');
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

async function testSimpleSearch() {
  console.log('🔍 Test 2: Simple Search (Engineer + Python)');
  console.log('=============================================');
  
  try {
    const testQuery: PDLQuery = {
      job_title: ['Engineer'],
      skills: ['python']
    };

    console.log('🎯 Searching for Python engineers...');
    console.log('Query:', testQuery);
    
    const candidates = await PDLService.searchCandidates(testQuery, 3);
    
    console.log(`✅ Found ${candidates.length} candidates:`);
    
    candidates.forEach((candidate, index) => {
      console.log(`\n--- Candidate ${index + 1} ---`);
      console.log(`Name: ${candidate.first_name}`);
      console.log(`Email: ${candidate.work_email}`);
      console.log(`Title: ${candidate.job_title || 'Not specified'}`);
      console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing simple search:', error);
  }
  
  console.log('');
}

async function testSkillsSearch() {
  console.log('🔍 Test 3: Skills-focused Search (React OR JavaScript)');
  console.log('====================================================');
  
  try {
    const testQuery: PDLQuery = {
      job_title: ['Software Engineer', 'Developer'],
      skills: ['react', 'javascript'],
      experience_level: ['senior']
    };

    console.log('🎯 Searching for Senior React/JS developers...');
    console.log('Query:', testQuery);
    
    const candidates = await PDLService.searchCandidates(testQuery, 3);
    
    console.log(`✅ Found ${candidates.length} candidates:`);
    
    candidates.forEach((candidate, index) => {
      console.log(`\n--- Candidate ${index + 1} ---`);
      console.log(`Name: ${candidate.first_name}`);
      console.log(`Email: ${candidate.work_email}`);
      console.log(`Title: ${candidate.job_title || 'Not specified'}`);
      console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing skills search:', error);
  }
  
  console.log('');
}

async function testConversationSearch() {
  console.log('🗣️ Test 4: Conversation Data Search');
  console.log('===================================');
  
  try {
    // Simulate realistic conversation data
    const conversationData = {
      recruiter_title: 'Founder',
      recruiter_company: 'TechStartup Inc',
      recruiter_mission: 'building AI-powered recruiting tools',
      role_title: 'Software Engineer',
      skills: 'Python, React',
      experience_level: 'Senior level',
      company_size: 'Startup to medium-sized',
      industry: 'SaaS, Technology',
      location: 'San Francisco'
    };

    console.log('🎯 Searching using conversation data...');
    console.log('Conversation data:', conversationData);
    
    const candidates = await PDLService.searchFromConversation(conversationData, 3);
    
    console.log(`✅ Found ${candidates.length} candidates from conversation:`);
    
    candidates.forEach((candidate, index) => {
      console.log(`\n--- Candidate ${index + 1} ---`);
      console.log(`Name: ${candidate.first_name}`);
      console.log(`Email: ${candidate.work_email}`);
      console.log(`Title: ${candidate.job_title || 'Not specified'}`);
      console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
    });
    
    // Show what the recruiting email would look like
    if (candidates.length > 0) {
      console.log('\n📧 Sample Recruiting Email:');
      console.log('===========================');
      const sampleCandidate = candidates[0];
      console.log(`To: ${sampleCandidate.work_email}`);
      console.log(`Subject: Software Engineer opportunity at TechStartup Inc`);
      console.log(`\nHi ${sampleCandidate.first_name},\n\nI came across your experience and thought you'd be a great fit for a Software Engineer role here at TechStartup Inc. We're passionate about building AI-powered recruiting tools, and I think your background aligns perfectly. The position is in San Francisco. Would you be open to a quick chat?\n\nBest,\nFounder | TechStartup Inc\n`);
    }
    
  } catch (error) {
    console.error('❌ Error testing conversation search:', error);
  }
  
  console.log('');
}

// Run the tests
runPDLTests().catch(console.error);