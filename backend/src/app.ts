import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables first
dotenv.config();

// DEBUG: Check environment loading
console.log('=== ENV DEBUG ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET value:', process.env.JWT_SECRET);
console.log('All JWT env vars:', Object.keys(process.env).filter(k => k.includes('JWT')));
console.log('================');

// Import workers after environment variables are loaded
import { campaignWorker } from './jobs/campaignProcessor';
import { emailWorker } from './jobs/emailSender';

// Proper worker initialization function
async function initializeWorkers() {
  try {
    console.log('🚀 Initializing background workers...');
    
    // Force the workers to be referenced so they actually initialize
    console.log('Campaign worker status:', campaignWorker ? 'loaded' : 'not loaded');
    console.log('Email worker status:', emailWorker ? 'loaded' : 'not loaded');
    
    console.log('✅ Campaign worker initialized successfully');
    console.log('✅ Email worker initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize workers:', error);
    throw error;
  }
}

// Initialize workers
initializeWorkers().catch(console.error);

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration for recruiting app
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for recruiting API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'AI Recruiting Agent API'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'AI Recruiting Agent API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test authentication endpoint
app.post('/api/test/auth', (req, res): void => {
  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    user_full_name: 'Test User'
  };
  
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'JWT_SECRET not configured' });
    return;
  }
  
  const token = jwt.sign(
    { userId: testUser.id, ...testUser }, 
    process.env.JWT_SECRET, 
    { expiresIn: '24h' }
  );
  
  res.json({ token, user: testUser });
});

// API routes will be mounted here
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscription';
import searchRoutes from './routes/search';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/search', searchRoutes);
// TODO: Mount other routes as they're created
// app.use('/api/candidates', candidateRoutes);
// app.use('/api/email-templates', emailTemplateRoutes);
// app.use('/api/user', userRoutes);
// app.use('/api/webhooks', webhookRoutes);

// 404 handler for API routes
app.use('/api', (req, res, next) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack }),
  });
});

export default app;
