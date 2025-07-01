const Redis = require('ioredis');
require('dotenv').config();

// Create a new Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

async function testRedis() {
  try {
    console.log('🚀 Testing Redis connection...');
    
    // Test connection
    await redis.ping();
    console.log('✅ Redis server is running');
    
    // Set a test key
    await redis.set('test:connection', 'success');
    console.log('✅ Set test key');
    
    // Get the test key
    const value = await redis.get('test:connection');
    console.log('✅ Got test value:', value);
    
    // Clean up
    await redis.del('test:connection');
    console.log('✅ Cleaned up test key');
    
    console.log('\n🎉 Redis connection test successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    redis.quit();
  }
}

testRedis();
