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
exports.clearAllCache = exports.deleteCache = exports.getCache = exports.setCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
// Create Redis client instance
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {}
        : undefined,
    retryStrategy: (times) => {
        // Reconnect after
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});
// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('🟢 Redis client connected');
});
redisClient.on('error', (err) => {
    console.error('🔴 Redis error:', err);
});
redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});
// Graceful shutdown
process.on('SIGINT', () => {
    redisClient.quit();
    console.log('👋 Redis client disconnected through app termination');
    process.exit(0);
});
// Helper functions
const setCache = (key, value, ttl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const strValue = JSON.stringify(value);
        if (ttl) {
            yield redisClient.setex(key, ttl, strValue);
        }
        else {
            yield redisClient.set(key, strValue);
        }
        return true;
    }
    catch (error) {
        console.error('Error setting cache:', error);
        return false;
    }
});
exports.setCache = setCache;
const getCache = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error('Error getting cache:', error);
        return null;
    }
});
exports.getCache = getCache;
const deleteCache = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield redisClient.del(key);
        return true;
    }
    catch (error) {
        console.error('Error deleting cache:', error);
        return false;
    }
});
exports.deleteCache = deleteCache;
const clearAllCache = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield redisClient.flushdb();
        return true;
    }
    catch (error) {
        console.error('Error clearing cache:', error);
        return false;
    }
});
exports.clearAllCache = clearAllCache;
exports.default = redisClient;
