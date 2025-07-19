import dotenv from 'dotenv';
dotenv.config();

// Database Configuration
export const DB_CONFIG = {
  URL: process.env.SUPABASE_URL!,
  NAME: process.env.SUPABASE_ANON_KEY!,
};

// Redis Configuration
export const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST || 'localhost',
  PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  PASSWORD: process.env.REDIS_PASSWORD,
  TLS: process.env.REDIS_TLS === 'true',
};

// Server Configuration
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET!,
};

// Email Service Configuration
export const EMAIL_CONFIG = {
  PROVIDER: process.env.EMAIL_PROVIDER,
  FROM_EMAIL: process.env.FROM_EMAIL,
  // Add other email-related configurations
};

// Third-party API Keys
export const API_KEYS = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PDL_API_KEY: process.env.PDL_API_KEY,
  // Add other API keys
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'DATABASE_NAME',
  'OPENAI_API_KEY',
  'PDL_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('✅ Configuration loaded successfully');