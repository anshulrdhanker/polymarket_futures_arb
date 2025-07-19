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
// File: scripts/test-pdl-improved.ts
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const pdlService_1 = require("../src/services/pdlService");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function runImprovedPDLTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Starting Improved PDL Service Tests\n');
        // Test 1: PDL Connection
        yield testPDLConnection();
        yield delay(7000); // Wait 7 seconds between requests
        // Test 2: Debug Raw Response
        yield testRawResponse();
        yield delay(7000);
        // Test 3: Broad Search
        yield testBroadSearch();
        yield delay(7000);
        // Test 4: Check for work_email availability
        yield testEmailAvailability();
        console.log('\n🎉 Improved PDL tests completed!');
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
function testRawResponse() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('🔍 Test 2: Debug Raw API Response');
        console.log('==================================');
        try {
            console.log('🎯 Making raw API call to see actual response...');
            // Make direct API call to see raw response
            const response = yield fetch('https://api.peopledatalabs.com/v5/person/search', {
                method: 'POST',
                headers: {
                    'X-Api-Key': process.env.PDL_API_KEY,
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
            const data = yield response.json();
            console.log('Raw API Response:');
            console.log('Status:', data.status);
            console.log('Total:', data.total);
            console.log('Data length:', ((_a = data.data) === null || _a === void 0 ? void 0 : _a.length) || 0);
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
        }
        catch (error) {
            console.error('❌ Error testing raw response:', error);
        }
        console.log('');
    });
}
function testBroadSearch() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍 Test 3: Broad Search (Any Engineer)');
        console.log('======================================');
        try {
            const testQuery = {
                job_title: ['engineer']
                // No other filters - as broad as possible
            };
            console.log('🎯 Searching for any engineers...');
            console.log('Query:', testQuery);
            const candidates = yield pdlService_1.PDLService.searchCandidates(testQuery, 2);
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
        }
        catch (error) {
            console.error('❌ Error testing broad search:', error);
        }
        console.log('');
    });
}
function testEmailAvailability() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📧 Test 4: Check Email Field Availability');
        console.log('=========================================');
        try {
            console.log('🎯 Testing different email field names...');
            const response = yield fetch('https://api.peopledatalabs.com/v5/person/search', {
                method: 'POST',
                headers: {
                    'X-Api-Key': process.env.PDL_API_KEY,
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
            const data = yield response.json();
            if (data.data && data.data.length > 0) {
                console.log('✅ Checking email field availability:');
                data.data.forEach((candidate, index) => {
                    console.log(`\n--- Candidate ${index + 1} ---`);
                    console.log(`Name: ${candidate.full_name || candidate.first_name}`);
                    console.log(`work_email: ${candidate.work_email || 'null'}`);
                    console.log(`emails: ${candidate.emails || 'null'}`);
                    console.log(`personal_emails: ${candidate.personal_emails || 'null'}`);
                    console.log(`recommended_personal_email: ${candidate.recommended_personal_email || 'null'}`);
                });
                // Count how many have any kind of email
                const withWorkEmail = data.data.filter((c) => c.work_email).length;
                const withEmails = data.data.filter((c) => c.emails).length;
                const withPersonalEmails = data.data.filter((c) => c.personal_emails).length;
                const withRecommendedEmail = data.data.filter((c) => c.recommended_personal_email).length;
                console.log('\n📊 Email availability stats:');
                console.log(`work_email: ${withWorkEmail}/${data.data.length}`);
                console.log(`emails: ${withEmails}/${data.data.length}`);
                console.log(`personal_emails: ${withPersonalEmails}/${data.data.length}`);
                console.log(`recommended_personal_email: ${withRecommendedEmail}/${data.data.length}`);
            }
        }
        catch (error) {
            console.error('❌ Error testing email availability:', error);
        }
        console.log('');
    });
}
// Run the tests
runImprovedPDLTests().catch(console.error);
