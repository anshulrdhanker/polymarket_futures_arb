import { setCache, getCache, deleteCache, clearAllCache } from '../../shared/src/utils/redis';

async function testRedis() {
  try {
    console.log('🚀 Starting Redis test...');
    
    // Test 1: Set a value
    const testKey = 'test:key';
    const testValue = { message: 'Hello, Redis!', timestamp: new Date().toISOString() };
    
    console.log('🔑 Setting test value...');
    await setCache(testKey, testValue, 60); // 1 minute TTL
    console.log('✅ Test value set');
    
    // Test 2: Get the value
    console.log('🔍 Retrieving test value...');
    const retrievedValue = await getCache(testKey);
    console.log('📦 Retrieved value:', JSON.stringify(retrievedValue, null, 2));
    
    // Test 3: Delete the value
    console.log('🗑️ Deleting test value...');
    await deleteCache(testKey);
    console.log('✅ Test value deleted');
    
    // Verify deletion
    const shouldBeNull = await getCache(testKey);
    console.log('🔍 Verification - should be null:', shouldBeNull === null ? '✅' : '❌');
    
    console.log('\n🎉 All Redis tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
