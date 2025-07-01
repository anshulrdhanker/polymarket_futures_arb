# AI Recruiting Outreach Agent - Step-by-Step Build Plan

## 📋 Pre-Development Setup (Day 1)

### Step 1: Environment Setup
- [ ] Install Node.js v18+
- [ ] Install Redis locally or use Redis Cloud
- [ ] Set up Git repository
- [ ] Create accounts: Supabase, OpenAI, People Data Labs, Google Cloud Console, Stripe

### Step 2: API Keys Collection
- [ ] OpenAI API key (with GPT-4 access)
- [ ] People Data Labs API key
- [ ] Google Cloud Console: Create project, enable Gmail API, get OAuth credentials
- [ ] Supabase: Create project, get database URL and keys
- [ ] Stripe: API keys for subscription management

### Step 3: Project Initialization
```bash
mkdir recruiting-agent && cd recruiting-agent
npm init -y
mkdir frontend backend database shared docs scripts
```

## 🗄️ Phase 1: Database Foundation (Days 1-2)

### Step 4: Supabase Database Setup
**File:** `database/migrations/001_initial_schema.sql`
```sql
-- Create users table
-- Create campaigns table  
-- Create candidates table
-- Create email_templates table
```

### Step 5: Seed Email Templates
**File:** `database/seeds/email_templates.sql`
- Research and write 20-30 recruiting email templates
- Categorize them (professional, casual, direct, warm)
- Focus on recruiting-specific templates like:
  - "Hi {name}, I'm reaching out about a {role_title} opportunity..."
  - "I came across your background in {skill} and wanted to connect..."
  - "We're looking for a {role_title} at {company}..."
- Insert into database

### Step 6: Database Connection Test
**File:** `backend/config/database.ts`
- Set up Supabase client
- Test connection
- Create basic query functions

## ⚙️ Phase 2: Backend Core (Days 2-4)

### Step 7: Express Server Foundation
**File:** `backend/src/app.ts`
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
// Middleware setup
// Route mounting
// Error handling
```

### Step 8: Environment Configuration
**File:** `backend/.env`
```
DATABASE_URL=
OPENAI_API_KEY=
PDL_API_KEY=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
REDIS_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
```

### Step 9: Basic Models
**File:** `backend/models/User.ts`
```typescript
export class User {
  static async create(userData: CreateUserData) { }
  static async findByEmail(email: string) { }
  static async updateGmailTokens(userId: string, tokens: GmailTokens) { }
  static async updateSubscription(userId: string, tier: string) { }
}
```

## 🔐 Phase 3: Authentication System (Days 4-5)

### Step 10: Gmail OAuth Setup
**File:** `backend/config/gmail.ts`
```typescript
import { google } from 'googleapis';

export const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);
```

### Step 11: Auth Routes
**File:** `backend/routes/auth.ts`
```typescript
// POST /auth/gmail - Start OAuth flow
// GET /auth/callback - Handle OAuth callback  
// POST /auth/refresh - Refresh tokens
// DELETE /auth/logout - Remove Gmail connection
```

[Previous content continues...]
