import { DB_CONFIG, REDIS_CONFIG, SERVER_CONFIG, EMAIL_CONFIG, API_KEYS } from './config';

console.log('Testing configuration...\n');

console.log('Database Config:', {
  URL: DB_CONFIG.URL ? '✅ Set' : '❌ Missing',
  NAME: DB_CONFIG.NAME ? '✅ Set' : '❌ Missing'
});

console.log('\nRedis Config:', {
  HOST: REDIS_CONFIG.HOST,
  PORT: REDIS_CONFIG.PORT,
  PASSWORD: REDIS_CONFIG.PASSWORD ? '✅ Set' : '❌ Missing',
  TLS: REDIS_CONFIG.TLS
});

console.log('\nServer Config:', {
  PORT: SERVER_CONFIG.PORT,
  NODE_ENV: SERVER_CONFIG.NODE_ENV,
  JWT_SECRET: SERVER_CONFIG.JWT_SECRET ? '✅ Set' : '❌ Missing'
});

console.log('\nEmail Config:', {
  PROVIDER: EMAIL_CONFIG.PROVIDER || '❌ Not set',
  FROM_EMAIL: EMAIL_CONFIG.FROM_EMAIL || '❌ Not set'
});

console.log('\nAPI Keys:', {
  OPENAI_API_KEY: API_KEYS.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
  PDL_API_KEY: API_KEYS.PDL_API_KEY ? '✅ Set' : '❌ Missing'
});

console.log('\n✅ Configuration test completed');
