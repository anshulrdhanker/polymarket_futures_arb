import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Validate OpenAI API key on startup
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for our recruiting use cases
export interface RoleInput {
  description: string;
  company?: string;
  location?: string;
  remote?: boolean;
  experienceLevel?: string;
  additionalRequirements?: string;
}

export interface PDLQuery {
  job_title?: string[];
  skills?: string[];
  location?: string[];
  experience_level?: string[];
  industry?: string[];
  company_size?: string[];
  current_company?: string[];
}

export interface CandidateInfo {
  full_name: string;
  current_title?: string;
  current_company?: string;
  skills?: string[];
  location?: string;
  experience_years?: number;
  selected_skill?: string;
}

export interface CampaignInfo {
  role_title: string;
  recruiter_name: string;
  recruiter_company: string;
  recruiter_title: string;
  recruiter_mission: string;
  location: string;
  salary_range?: string;
  is_remote: string;
}

export interface ConversationState {
  currentStep: number;
  isComplete: boolean;
  collectedData: {
    outreach_type?: 'recruiting' | 'sales';
    user_title?: string;
    user_company?: string;
    user_mission?: string;
    tone?: string;
    // Recruiting specific
    role_title?: string;
    skills?: string;
    experience_level?: string;
    // Sales specific
    buyer_title?: string;
    pain_point?: string;
    // Shared
    company_size?: string;
    industry?: string;
    location?: string;
  };
}

export interface ScriptedConversationResponse {
  message: string;
  conversationState: ConversationState;
}

export class OpenAIService {
  /**
   * Base conversation flow (applies to both recruiting and sales)
   */
  private static readonly BASE_SCRIPT = [
    "Hey — I'll help you find the right people and send personalized emails to them automatically. First, what kind of outreach are you doing right now — sales or recruiting?",
    "Got it. Let's personalize everything to sound like it's coming from you. What's your name and role at the company?",
    "And what's the name of your company?",
    "In one sentence, what does your company do? I'll use this to write contextually relevant emails.",
    "What tone should I write in? (Casual, direct, professional, witty?)"
  ];

  /**
   * Recruiting-specific questions
   */
  private static readonly RECRUITING_SCRIPT = [
    "What role are you hiring for?",
    "What are some must-have skills or tools? (e.g. Python, React, Salesforce) — or just say 'skip' if not relevant.",
    "What level of seniority? (Junior, Mid, Senior, VP, etc.)",
    "What kind of companies should they be coming from? (Startups, mid-sized, enterprise, or no preference)",
    "Any specific industries? (e.g. Fintech, SaaS, etc.)",
    "Where should they be located — or is this remote?"
  ];

  /**
   * Sales-specific questions
   */
  private static readonly SALES_SCRIPT = [
    "Who is your ideal buyer? (e.g. Head of Marketing, Founder, CTO, Account Executive)",
    "What type of companies do they work at? (e.g. SaaS startups, law firms, eCommerce brands)",
    "What size are these companies? (Solo, 2-10, 11-50, 51-200, etc.)",
    "What pain point does your product solve for this buyer? (This helps me make your emails hit harder)",
    "Any specific industries? (e.g. Fintech, SaaS, etc.)",
    "Any geography preference — or is this remote/global?"
  ];

  private static readonly COMPLETION_MESSAGE = 
    "Thanks for sharing everything. I'm ready to start finding the perfect people and writing personalized emails. But first, you'll need to log in with Gmail so I can send on your behalf. Just click the 'Try 3 for free' button to get started.";

  /**
   * Get the appropriate conversation script based on current state
   */
  private static getConversationScript(collectedData: ConversationState['collectedData']): string[] {
    const baseLength = this.BASE_SCRIPT.length;
    
    if (!collectedData.outreach_type) {
      return this.BASE_SCRIPT;
    } else if (collectedData.outreach_type === 'recruiting') {
      return [...this.BASE_SCRIPT, ...this.RECRUITING_SCRIPT];
    } else {
      return [...this.BASE_SCRIPT, ...this.SALES_SCRIPT];
    }
  }

  /**
   * Get field mapping for data extraction based on conversation step and type
   */
  private static getStepMapping(collectedData: ConversationState['collectedData']): string[] {
    const baseMapping = ['outreach_type', 'user_title', 'user_company', 'user_mission', 'tone'];
    
    if (!collectedData.outreach_type) {
      return baseMapping;
    } else if (collectedData.outreach_type === 'recruiting') {
      return [...baseMapping, 'role_title', 'skills', 'experience_level', 'company_size', 'industry', 'location'];
    } else {
      return [...baseMapping, 'buyer_title', 'company_size', 'experience_level', 'pain_point', 'industry', 'location'];
    }
  }

  /**
   * Helper method for OpenAI API calls with retry logic
   */
  private static async callOpenAI(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: options.model || "gpt-4",
          messages,
          temperature: options.temperature || 0.3,
          max_tokens: options.max_tokens || 500,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error('No response from OpenAI');
        }

        return responseText;

      } catch (error: any) {
        const isRetryableError = 
          error?.status === 429 || // Rate limit
          error?.status === 500 || // Server error
          error?.status === 502 || // Bad gateway
          error?.status === 503;   // Service unavailable

        if (attempt === maxRetries || !isRetryableError) {
          console.error(`OpenAI API call failed after ${attempt} attempts:`, error);
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`OpenAI API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error?.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Helper method to safely parse JSON responses
   */
  private static parseJSONResponse<T>(responseText: string, context: string): T {
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`Failed to parse OpenAI JSON response for ${context}:`, responseText);
      throw new Error(`Invalid JSON response from OpenAI for ${context}`);
    }
  }

  /**
   * Process scripted conversation step with branching logic
   */
  static async processScriptedConversation(
    userMessage: string,
    currentState: ConversationState
  ): Promise<ScriptedConversationResponse> {
    try {
      // If conversation is already complete, don't process further
      if (currentState.isComplete) {
        return {
          message: this.COMPLETION_MESSAGE,
          conversationState: currentState
        };
      }

      // Extract information from user's response using AI
      const extractedInfo = await this.extractInfoFromResponse(
        userMessage,
        currentState.currentStep,
        currentState.collectedData
      );

      // Update collected data
      const updatedData = { ...currentState.collectedData, ...extractedInfo };

      // Get the appropriate script based on the updated data
      const conversationScript = this.getConversationScript(updatedData);

      // Advance to next step
      const nextStep = currentState.currentStep + 1;
      
      // Check if conversation is complete
      if (nextStep >= conversationScript.length) {
        const finalState: ConversationState = {
          currentStep: nextStep,
          isComplete: true,
          collectedData: updatedData
        };

        return {
          message: this.COMPLETION_MESSAGE,
          conversationState: finalState
        };
      }

      // Return next scripted message
      const newState: ConversationState = {
        currentStep: nextStep,
        isComplete: false,
        collectedData: updatedData
      };

      return {
        message: conversationScript[nextStep],
        conversationState: newState
      };

    } catch (error) {
      console.error('Error processing scripted conversation:', error);
      
      // Return current question again on error
      const conversationScript = this.getConversationScript(currentState.collectedData);
      return {
        message: conversationScript[currentState.currentStep],
        conversationState: currentState
      };
    }
  }

  /**
   * Extract specific information based on conversation step and type
   */
  private static async extractInfoFromResponse(
    userMessage: string,
    currentStep: number,
    collectedData: ConversationState['collectedData']
  ): Promise<Partial<ConversationState['collectedData']>> {
    const stepMapping = this.getStepMapping(collectedData);
    const fieldToExtract = stepMapping[currentStep];
    
    if (!fieldToExtract) return {};

    // Special handling for outreach_type (first question)
    if (fieldToExtract === 'outreach_type') {
      const prompt = `
Determine if the user is doing "recruiting" or "sales" from this response: "${userMessage}"

Rules:
- If they mention hiring, recruiting, candidates, talent, etc. → return "recruiting"
- If they mention sales, prospects, customers, leads, etc. → return "sales"
- Return only "recruiting" or "sales", nothing else
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You determine if a user is doing recruiting or sales outreach. Return only 'recruiting' or 'sales'."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      try {
        const responseText = await this.callOpenAI(messages, {
          model: "gpt-4",
          temperature: 0.1,
          max_tokens: 10,
        });

        const outreachType = responseText.trim().toLowerCase();
        return { outreach_type: outreachType === 'recruiting' ? 'recruiting' : 'sales' };
      } catch (error) {
        console.error('Error extracting outreach type:', error);
        return { outreach_type: 'recruiting' }; // Default fallback
      }
    }

    // Standard field extraction
    const prompt = `
Extract the ${fieldToExtract} from this user response: "${userMessage}"

Rules:
- Return only the extracted information, no explanation
- Be concise but capture the key details
- For skills, extract as comma-separated list
- For location, include "remote" if mentioned

Response format: Just the extracted value, nothing else.
`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You extract specific information from user responses. Return only the requested information, no explanations."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    try {
      const responseText = await this.callOpenAI(messages, {
        model: "gpt-4",
        temperature: 0.1,
        max_tokens: 100,
      });

      return { [fieldToExtract]: responseText.trim() };
    } catch (error) {
      console.error(`Error extracting ${fieldToExtract}:`, error);
      return {};
    }
  }

  // The convertToPDLQuery method has been removed as part of architectural improvement.
  // PDL query building is now handled exclusively by PDLService.searchFromConversation
  // which uses structured logic and mappings instead of OpenAI-based conversion.

  /**
   * Initialize new conversation
   */
  static initializeConversation(): ScriptedConversationResponse {
    const initialState: ConversationState = {
      currentStep: 0,
      isComplete: false,
      collectedData: {}
    };

    return {
      message: this.BASE_SCRIPT[0],
      conversationState: initialState
    };
  }

  /**
   * Handle off-topic responses by repeating current question
   */
  static handleOffTopicResponse(currentState: ConversationState): ScriptedConversationResponse {
    const conversationScript = this.getConversationScript(currentState.collectedData);
    return {
      message: conversationScript[currentState.currentStep],
      conversationState: currentState
    };
  }

  // ... (rest of your existing methods remain the same)
  
  /**
   * Analyze role requirements and convert to PDL search parameters
   */
  static async analyzeRole(roleInput: RoleInput): Promise<PDLQuery> {
    // ... existing implementation
    return {} as PDLQuery; // placeholder
  }

  /**
   * Generate personalized recruiting email with subject and body
   */
  static async generateRecruitingEmail(
    candidate: CandidateInfo,
    campaign: CampaignInfo,
    template: string
  ): Promise<{ subject: string; body: string }> {
    try {
      const prompt = `
You are an expert recruiting copywriter. Create a personalized recruiting email using the template and candidate information.

CANDIDATE INFORMATION:
Name: ${candidate.full_name}
Current Title: ${candidate.current_title || 'Not specified'}
Current Company: ${candidate.current_company || 'Not specified'}
Key Skill: ${candidate.selected_skill || candidate.skills?.[0] || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Experience: ${candidate.experience_years ? `${candidate.experience_years} years` : 'Not specified'}

CAMPAIGN INFORMATION:
Role: ${campaign.role_title}
Recruiter: ${campaign.recruiter_name}
Company: ${campaign.recruiter_company}
Recruiter Title: ${campaign.recruiter_title}
Company Mission: ${campaign.recruiter_mission}
Job Location: ${campaign.location}
Salary Range: ${campaign.salary_range || 'Not specified'}
Remote Policy: ${campaign.is_remote}

EMAIL TEMPLATE:
${template}

INSTRUCTIONS:
1. Generate a compelling subject line (under 50 characters)
2. Create the email body using the template and personalizing it
3. Replace ALL variables in the template
4. Make it professional but warm
5. Return as JSON with "subject" and "body" fields

Return format:
{
  "subject": "Great opportunity for [Name] - [Role] at [Company]",
  "body": "The personalized email content here..."
}

Return only valid JSON, no explanations.`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a professional recruiting copywriter who creates personalized emails. Always return valid JSON with subject and body fields."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const responseText = await this.callOpenAI(messages, {
        model: "gpt-4",
        temperature: 0.7,
        max_tokens: 800,
      });

      // Parse the JSON response
      const emailContent = this.parseJSONResponse<{ subject: string; body: string }>(responseText, 'email generation');
      
      return emailContent;

    } catch (error) {
      console.error('Error generating recruiting email with OpenAI:', error);
      
      // Fallback: return structured response
      return {
        subject: `Exciting ${campaign.role_title} opportunity at ${campaign.recruiter_company}`,
        body: template
          .replace('{name}', candidate.full_name)
          .replace('{skills}', candidate.selected_skill || candidate.skills?.[0] || 'your expertise')
          .replace('{role_title}', campaign.role_title)
          .replace('{recruiter_company}', campaign.recruiter_company)
          .replace('{recruiter_name}', campaign.recruiter_name)
      };
    }
  }

  /**
   * Validate OpenAI API connection
   */
  static async testConnection(): Promise<boolean> {
    // ... existing implementation
    return true; // placeholder
  }
}