import dotenv from 'dotenv';
import { QueueService } from '../src/services/queueService';
import { campaignQueue, emailQueue, closeQueues } from '../src/config/redis';

// Load environment variables
dotenv.config();

async function testQueueSetup() {
  const TEST_CAMPAIGN_ID = 'test-campaign-123';
  const TEST_USER_ID = 'test-user';

  try {
    console.log('🚀 Starting queue setup test...');

    // Test 1: Redis Connection
    console.log('\n🔍 Testing Redis connection...');
    const health = await QueueService.getQueueHealth();
    console.log('✅ Queue health check successful');
    console.log('📊 Queue health:', JSON.stringify(health, null, 2));

    // Test 2: Queue Job Addition
    console.log('\n📨 Testing job queuing...');
    await QueueService.startCampaignProcessing(
      TEST_CAMPAIGN_ID,
      TEST_USER_ID,
      { test: true, timestamp: new Date().toISOString() }
    );
    console.log('✅ Successfully added campaign job to queue');

    // Test 3: Queue Status Check
    console.log('\n📊 Testing campaign status...');
    const status = await QueueService.getCampaignStatus(TEST_CAMPAIGN_ID);
    console.log('✅ Successfully retrieved campaign status');
    console.log('📋 Campaign status:', JSON.stringify(status, null, 2));

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await closeQueues();
    console.log('✅ Cleanup complete');
    
    // Small delay to ensure all logs are printed before exit
    setTimeout(() => process.exit(), 100);
  }
}

// Execute the test
testQueueSetup().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
