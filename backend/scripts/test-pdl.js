"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: scripts/test-pdl.ts
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const pdlService_1 = require("../src/services/pdlService");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
function runPDLTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Starting PDL Service Tests (Updated Logic)\n');
        // Test 1: PDL Connection
        yield testPDLConnection();
        // Test 2: Simple Search
        yield testSimpleSearch();
        // Test 3: Skills-focused Search
        yield testSkillsSearch();
        // Test 4: Conversation Data Search
        yield testConversationSearch();
        console.log('\n🎉 PDL tests completed!');
    });
}
function testPDLConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔌 Test 1: PDL API Connection');
        console.log('=============================');
        try {
            const isConnected = yield pdlService_1.PDLService.testConnection();
            if (isConnected) {
                console.log('✅ Successfully connected to PDL API!');
            }
            else {
                console.log('❌ Failed to connect to PDL API');
            }
        }
        catch (error) {
            console.error('❌ Error testing PDL connection:', error);
        }
        console.log('');
    });
}
function testSimpleSearch() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Test 2: Simple Search (Engineer + Python)');
        console.log('=============================================');
        try {
            const testQuery = {
                job_title: ['Engineer'],
                skills: ['python']
            };
            console.log('🎯 Searching for Python engineers...');
            console.log('Query:', testQuery);
            const candidates = yield pdlService_1.PDLService.searchCandidates(testQuery, 3);
            console.log(`✅ Found ${candidates.length} candidates:`);
            candidates.forEach((candidate, index) => {
                console.log(`\n--- Candidate ${index + 1} ---`);
                console.log(`Name: ${candidate.first_name}`);
                console.log(`Email: ${candidate.work_email}`);
                console.log(`Title: ${candidate.job_title || 'Not specified'}`);
                console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
            });
        }
        catch (error) {
            console.error('❌ Error testing simple search:', error);
        }
        console.log('');
    });
}
function testSkillsSearch() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Test 3: Skills-focused Search (React OR JavaScript)');
        console.log('====================================================');
        try {
            const testQuery = {
                job_title: ['Software Engineer', 'Developer'],
                skills: ['react', 'javascript'],
                experience_level: ['senior']
            };
            console.log('🎯 Searching for Senior React/JS developers...');
            console.log('Query:', testQuery);
            const candidates = yield pdlService_1.PDLService.searchCandidates(testQuery, 3);
            console.log(`✅ Found ${candidates.length} candidates:`);
            candidates.forEach((candidate, index) => {
                console.log(`\n--- Candidate ${index + 1} ---`);
                console.log(`Name: ${candidate.first_name}`);
                console.log(`Email: ${candidate.work_email}`);
                console.log(`Title: ${candidate.job_title || 'Not specified'}`);
                console.log(`Company: ${candidate.job_company_name || 'Not specified'}`);
            });
        }
        catch (error) {
            console.error('❌ Error testing skills search:', error);
        }
        console.log('');
    });
}
function testConversationSearch() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const candidates = yield pdlService_1.PDLService.searchFromConversation(conversationData, 3);
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
        }
        catch (error) {
            console.error('❌ Error testing conversation search:', error);
        }
        console.log('');
    });
}
// Run the tests
runPDLTests().catch(console.error);
