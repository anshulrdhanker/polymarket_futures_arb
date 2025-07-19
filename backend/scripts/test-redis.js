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
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("../../shared/src/utils/redis");
function testRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Starting Redis test...');
            // Test 1: Set a value
            const testKey = 'test:key';
            const testValue = { message: 'Hello, Redis!', timestamp: new Date().toISOString() };
            console.log('🔑 Setting test value...');
            yield (0, redis_1.setCache)(testKey, testValue, 60); // 1 minute TTL
            console.log('✅ Test value set');
            // Test 2: Get the value
            console.log('🔍 Retrieving test value...');
            const retrievedValue = yield (0, redis_1.getCache)(testKey);
            console.log('📦 Retrieved value:', JSON.stringify(retrievedValue, null, 2));
            // Test 3: Delete the value
            console.log('🗑️ Deleting test value...');
            yield (0, redis_1.deleteCache)(testKey);
            console.log('✅ Test value deleted');
            // Verify deletion
            const shouldBeNull = yield (0, redis_1.getCache)(testKey);
            console.log('🔍 Verification - should be null:', shouldBeNull === null ? '✅' : '❌');
            console.log('\n🎉 All Redis tests completed successfully!');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ Redis test failed:', error);
            process.exit(1);
        }
    });
}
testRedis();
