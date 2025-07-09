// File: backend/services/pdlService.ts
import dotenv from 'dotenv';
import { ConversationState } from './openaiService';

// Define PDLQuery interface locally
export interface PDLQuery {
  job_title?: string[];
  skills?: string[];
  location?: string[];
  experience_level?: string[];
  industry?: string[];
  company_size?: string[];
  current_company?: string[];
}

dotenv.config();

// Validate PDL API key on startup
if (!process.env.PDL_API_KEY) {
  throw new Error('PDL_API_KEY environment variable is required');
}

// PDL API configuration
const PDL_API_BASE_URL = 'https://api.peopledatalabs.com/v5';
const PDL_API_KEY = process.env.PDL_API_KEY;

// Interface for candidate results
export interface Candidate {
  first_name: string;
  work_email: string;
  full_name?: string; // Optional for display
  job_title?: string; // Optional for context
  job_company_name?: string; // Optional for context
}

// Interface for PDL API response
interface PDLResponse {
  status: number;
  data: Array<{
    id: string;
    first_name?: string;
    full_name?: string;
    work_email?: string;
    job_title?: string;
    job_company_name?: string;
    [key: string]: any;
  }>;
  scroll_token?: string;
  total: number;
}

export class PDLService {
  /**
   * Search for candidates using PDL Person Search API
   */
  static async searchCandidates(
    query: PDLQuery, 
    maxCandidates: number = 50
  ): Promise<Candidate[]> {
    try {
      // Convert PDLQuery to Elasticsearch query format
      const elasticsearchQuery = this.convertToElasticsearchQuery(query);
      
      console.log('Searching PDL with query:', JSON.stringify(elasticsearchQuery, null, 2));
      
      // Make API call to PDL
      const response = await this.callPDLAPI(elasticsearchQuery, maxCandidates);
      
      // Parse and return candidates
      const candidates = this.parseResponse(response);
      
      console.log(`Found ${candidates.length} candidates`);
      return candidates;
      
    } catch (error) {
      console.error('Error searching candidates with PDL:', error);
      throw new Error('Failed to search candidates');
    }
  }

  /**
   * Convert PDLQuery format to Elasticsearch query format
   */
  private static convertToElasticsearchQuery(query: PDLQuery): object {
    // Start with a simple match all query
    const finalQuery: any = { bool: { must: [] } };

    // Job title search (use first title only for now)
    if (query.job_title && query.job_title.length > 0) {
      finalQuery.bool.must.push({
        match: {
          job_title: query.job_title[0].toLowerCase()
        }
      });
    }

    // Skills search (use first skill only for now)
    if (query.skills && query.skills.length > 0) {
      const cleanSkill = query.skills[0].trim().toLowerCase();
      if (cleanSkill) {
        finalQuery.bool.must.push({
          match: {
            skills: cleanSkill
          }
        });
      }
    }

    // Location search (use first location only for now)
    if (query.location && query.location.length > 0) {
      const location = query.location[0].trim();
      if (location && !location.toLowerCase().includes('remote')) {
        finalQuery.bool.must.push({
          match: {
            location_name: location
          }
        });
      }
    }

    // For now, we'll skip experience level to keep the query simple
    // and match the working testConnection format

    // If no specific criteria, just return a match all query
    if (finalQuery.bool.must.length === 0) {
      return { match_all: {} };
    }

    return finalQuery;
  }

  /**
   * Make HTTP call to PDL API
   */
  private static async callPDLAPI(
    elasticsearchQuery: object, 
    maxCandidates: number
  ): Promise<PDLResponse> {
    const requestBody = {
      query: elasticsearchQuery,
      size: Math.min(maxCandidates, 100), // PDL max is 100 per request
      data_include: 'first_name,full_name,work_email,job_title,job_company_name'
    };

    const response = await fetch(`${PDL_API_BASE_URL}/person/search`, {
      method: 'POST',
      headers: {
        'X-Api-Key': PDL_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PDL API error ${response.status}:`, errorText);
      throw new Error(`PDL API request failed: ${response.status}`);
    }

    const data: PDLResponse = await response.json();
    
    if (data.status !== 200) {
      console.error('PDL API returned error:', data);
      throw new Error(`PDL API error: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Parse PDL response and extract candidate data
   */
  private static parseResponse(response: PDLResponse): Candidate[] {
    if (!response.data || response.data.length === 0) {
      console.log('No candidates found in PDL response');
      return [];
    }

    const candidates: Candidate[] = [];

    for (const person of response.data) {
      // Skip if missing essential fields
      if (!person.first_name || !person.work_email) {
        continue;
      }

      const candidate: Candidate = {
        first_name: person.first_name,
        work_email: person.work_email,
        full_name: person.full_name,
        job_title: person.job_title,
        job_company_name: person.job_company_name
      };

      candidates.push(candidate);
    }

    console.log(`Parsed ${candidates.length} valid candidates from ${response.data.length} records`);
    return candidates;
  }

  /**
   * Search candidates using conversation data directly
   */
  static async searchFromConversation(
    conversationData: ConversationState['collectedData'],
    maxCandidates: number = 50
  ): Promise<Candidate[]> {
    try {
      // Convert conversation data to PDLQuery format
      const pdlQuery: PDLQuery = {
        job_title: conversationData.role_title ? [conversationData.role_title] : [],
        skills: conversationData.skills ? conversationData.skills.split(',').map((s: string) => s.trim()) : [],
        location: conversationData.location ? [conversationData.location] : [],
        experience_level: conversationData.experience_level ? [conversationData.experience_level] : [],
        industry: conversationData.industry ? [conversationData.industry] : [],
        company_size: conversationData.company_size ? [conversationData.company_size] : []
      };

      return await this.searchCandidates(pdlQuery, maxCandidates);
      
    } catch (error) {
      console.error('Error searching candidates from conversation data:', error);
      throw new Error('Failed to search candidates from conversation');
    }
  }

  /**
   * Test PDL API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('Testing PDL API connection...');
      
      // Simple test query
      const testQuery = {
        match: {
          job_title: 'engineer'
        }
      };

      const response = await this.callPDLAPI(testQuery, 1);
      
      console.log(`PDL connection test successful. Found ${response.total} total engineers.`);
      return true;
      
    } catch (error) {
      console.error('PDL connection test failed:', error);
      return false;
    }
  }

  /**
   * Get PDL API usage stats (if available)
   */
  static async getUsageStats(): Promise<any> {
    try {
      // Note: PDL doesn't have a direct usage endpoint in free tier
      // This is a placeholder for future implementation
      console.log('Usage stats not available in free tier');
      return { message: 'Usage stats not available in free tier' };
      
    } catch (error) {
      console.error('Error getting PDL usage stats:', error);
      return null;
    }
  }
}