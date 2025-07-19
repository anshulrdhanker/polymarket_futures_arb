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
const dotenv_1 = __importDefault(require("dotenv"));
const queueService_1 = require("../src/services/queueService");
const redis_1 = require("../src/config/redis");
// Load environment variables
dotenv_1.default.config();
function testQueueSetup() {
    return __awaiter(this, void 0, void 0, function* () {
        const TEST_CAMPAIGN_ID = 'test-campaign-123';
        const TEST_USER_ID = 'test-user';
        try {
            console.log('🚀 Starting queue setup test...');
            // Test 1: Redis Connection
            console.log('\n🔍 Testing Redis connection...');
            const health = yield queueService_1.QueueService.getQueueHealth();
            console.log('✅ Queue health check successful');
            console.log('📊 Queue health:', JSON.stringify(health, null, 2));
            // Test 2: Queue Job Addition
            console.log('\n📨 Testing job queuing...');
            yield queueService_1.QueueService.startCampaignProcessing(TEST_CAMPAIGN_ID, TEST_USER_ID, { test: true, timestamp: new Date().toISOString() });
            console.log('✅ Successfully added campaign job to queue');
            // Test 3: Queue Status Check
            console.log('\n📊 Testing campaign status...');
            const status = yield queueService_1.QueueService.getCampaignStatus(TEST_CAMPAIGN_ID);
            console.log('✅ Successfully retrieved campaign status');
            console.log('📋 Campaign status:', JSON.stringify(status, null, 2));
            console.log('\n🎉 All tests completed successfully!');
        }
        catch (error) {
            console.error('❌ Test failed:', error);
            process.exitCode = 1; // Indicate failure
        }
        finally {
            // Cleanup
            console.log('\n🧹 Cleaning up...');
            yield (0, redis_1.closeQueues)();
            console.log('✅ Cleanup complete');
            // Small delay to ensure all logs are printed before exit
            setTimeout(() => process.exit(), 100);
        }
    });
}
// Execute the test
testQueueSetup().catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
});
