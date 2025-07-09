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
    recruiter_title?: string;
    recruiter_company?: string;
    recruiter_mission?: string;
    role_title?: string;
    skills?: string;
    experience_level?: string;
    company_size?: string;
    industry?: string;
    location?: string;
  };
}

export interface ScriptedConversationResponse {
  message: string;
  conversationState: ConversationState;
  pdlQuery?: PDLQuery;
}

export class OpenAIService {
  /**
   * Scripted conversation flow for Reach
   */
  private static readonly CONVERSATION_SCRIPT = [
    "Hey, I'm Reach. I'm here to find your perfect prospects and send personalized emails to them. But I'm going to need some info first. Easy question to start: What's your title at your company? Are you a recruiter? A founder?",
    "Cool — I need this sort of info to personalize the emails. Next question - what's the name of the company you work at?",
    "Great — I haven't heard of them, but sounds cool. What problem does your company solve for your customers? For example, Google helps the world access information. Don't worry, be broad if needed — I'md like to think I'm pretty smart.",
    "Awesome — now, let's talk about who you're looking for right now. What's their role title? Software engineer? Account Executive?",
    "Great. What are some must-have skills? (Python, Salesforce, AWS?)",
    "Amazing, this is helping me find the perfect prospects for you. How senior are you looking to hire? Junior level? VP?",
    "Ok, great. And what company size are they working for right now — startup? Midsized? Enterprise? Or no preference",
    "Got it - don't worry, only two more. What industries should I target? (Fintech, SaaS?)",
    "Sounds good. And finally, where is this position located? Or is it remote?"
  ];

  private static readonly COMPLETION_MESSAGE = "Thanks for sharing everything. I'm ready to start finding prospects for you and personalizing each email. But first, you're goingto need to login via gmail so I can send on your behalf. Go head and click the 'Try 3 for free' button.";

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
   * Helper method to truncate conversation history
   */
  private static truncateConversationHistory(
    conversationHistory: string[],
    maxMessages: number = 10
  ): string[] {
    if (conversationHistory.length <= maxMessages) {
      return conversationHistory;
    }

    // Keep the last N messages
    const truncated = conversationHistory.slice(-maxMessages);
    
    // Add a note about truncation
    const truncationNote = `[Previous conversation truncated - showing last ${maxMessages} messages]`;
    return [truncationNote, ...truncated];
  }

  /**
   * Process scripted conversation step
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
          conversationState: currentState,
          pdlQuery: await this.convertToPDLQuery(currentState.collectedData)
        };
      }

      // Extract information from user's response using AI
      const extractedInfo = await this.extractInfoFromResponse(
        userMessage,
        currentState.currentStep
      );

      // Update collected data
      const updatedData = { ...currentState.collectedData, ...extractedInfo };

      // Advance to next step
      const nextStep = currentState.currentStep + 1;
      
      // Check if conversation is complete
      if (nextStep >= this.CONVERSATION_SCRIPT.length) {
        const finalState: ConversationState = {
          currentStep: nextStep,
          isComplete: true,
          collectedData: updatedData
        };

        return {
          message: this.COMPLETION_MESSAGE,
          conversationState: finalState,
          pdlQuery: await this.convertToPDLQuery(updatedData)
        };
      }

      // Return next scripted message
      const newState: ConversationState = {
        currentStep: nextStep,
        isComplete: false,
        collectedData: updatedData
      };

      return {
        message: this.CONVERSATION_SCRIPT[nextStep],
        conversationState: newState
      };

    } catch (error) {
      console.error('Error processing scripted conversation:', error);
      
      // Return current question again on error
      return {
        message: this.CONVERSATION_SCRIPT[currentState.currentStep],
        conversationState: currentState
      };
    }
  }

  /**
   * Extract specific information based on conversation step
   */
  private static async extractInfoFromResponse(
    userMessage: string,
    currentStep: number
  ): Promise<Partial<ConversationState['collectedData']>> {
    const stepMapping = [
      'recruiter_title',     // Step 0: title
      'recruiter_company',   // Step 1: company
      'recruiter_mission',   // Step 2: mission
      'role_title',         // Step 3: role
      'skills',             // Step 4: skills
      'experience_level',   // Step 5: seniority
      'company_size',       // Step 6: company size
      'industry',           // Step 7: industry
      'location'            // Step 8: location
    ];

    const fieldToExtract = stepMapping[currentStep];
    if (!fieldToExtract) return {};

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

  /**
   * Convert collected conversation data to PDL query format
   */
  static async convertToPDLQuery(
    collectedData: ConversationState['collectedData']
  ): Promise<PDLQuery> {
    try {
      const prompt = `
Convert this collected recruiting information into PDL search parameters:

Collected Data:
${JSON.stringify(collectedData, null, 2)}

Convert to this JSON format:
{
  "job_title": ["array of relevant job titles"],
  "skills": ["array of technical skills"],
  "location": ["array of locations or empty if remote"],
  "experience_level": ["entry", "mid", "senior"],
  "industry": ["array of industries"],
  "company_size": ["startup", "small", "medium", "large", "enterprise"],
  "current_company": []
}

Rules:
- Map role_title to job_title variations
- Parse skills string into array
- Map experience_level to standard levels
- Convert company_size to standard categories
- Parse industry into relevant categories
- Handle location/remote preferences

Return only valid JSON.
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You convert recruiting conversation data into structured PDL search parameters. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const responseText = await this.callOpenAI(messages, {
        model: "gpt-4",
        temperature: 0.2,
        max_tokens: 400,
      });

      return this.parseJSONResponse<PDLQuery>(responseText, 'PDL query conversion');

    } catch (error) {
      console.error('Error converting to PDL query:', error);
      // Return basic fallback
      return {
        job_title: collectedData.role_title ? [collectedData.role_title] : [],
        skills: collectedData.skills ? collectedData.skills.split(',').map(s => s.trim()) : [],
        location: collectedData.location ? [collectedData.location] : [],
        experience_level: collectedData.experience_level ? [collectedData.experience_level] : [],
        industry: collectedData.industry ? [collectedData.industry] : [],
        company_size: collectedData.company_size ? [collectedData.company_size] : []
      };
    }
  }

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
      message: this.CONVERSATION_SCRIPT[0],
      conversationState: initialState
    };
  }

  /**
   * Handle off-topic responses by repeating current question
   */
  static handleOffTopicResponse(currentState: ConversationState): ScriptedConversationResponse {
    return {
      message: this.CONVERSATION_SCRIPT[currentState.currentStep],
      conversationState: currentState
    };
  }

  /**
   * Analyze role requirements and convert to PDL search parameters
   */
  static async analyzeRole(roleInput: RoleInput): Promise<PDLQuery> {
    try {
      const prompt = `
You are a recruiting expert. Analyze this job description and extract structured search parameters.

Job Description: "${roleInput.description}"
Company: ${roleInput.company || 'Not specified'}
Location: ${roleInput.location || 'Not specified'}
Remote: ${roleInput.remote ? 'Yes' : 'No'}
Experience Level: ${roleInput.experienceLevel || 'Not specified'}
Additional Requirements: ${roleInput.additionalRequirements || 'None'}

Extract the following information in JSON format:
{
  "job_title": ["array of relevant job titles"],
  "skills": ["array of required technical skills"],
  "location": ["array of location preferences if not remote"],
  "experience_level": ["entry", "mid", "senior"],
  "industry": ["array of relevant industries"],
  "company_size": ["startup", "small", "medium", "large", "enterprise"]
}

Rules:
- Be specific with job titles (e.g., "Frontend Developer", "React Developer")
- Include both primary and related skills
- Map experience descriptions to: entry (0-2 years), mid (3-5 years), senior (6+ years)
- If remote is specified, minimize location requirements
- Include relevant industries based on the role and company
- Estimate company size preferences based on role complexity

Return only valid JSON, no explanation.
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a recruiting expert who converts job descriptions into structured search parameters. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      const responseText = await this.callOpenAI(messages, {
        model: "gpt-4",
        temperature: 0.3,
        max_tokens: 500,
      });

      // Safely parse JSON response
      const pdlQuery: PDLQuery = this.parseJSONResponse(responseText, 'role analysis');
      return pdlQuery;

    } catch (error) {
      console.error('Error analyzing role with OpenAI:', error);
      throw new Error('Failed to analyze role requirements');
    }
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
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: "Hello, can you respond with just the word 'success'?"
        }
      ];

      const responseText = await this.callOpenAI(messages, {
        model: "gpt-3.5-turbo",
        max_tokens: 10,
      });

      return responseText.toLowerCase().includes('success');
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}