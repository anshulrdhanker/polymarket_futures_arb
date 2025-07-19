// File: backend/services/pdlService.ts
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PDL_API_KEY) {
  throw new Error('PDL_API_KEY environment variable is required');
}

const PDL_API_BASE_URL = 'https://api.peopledatalabs.com/v5';
const PDL_API_KEY = process.env.PDL_API_KEY;

// Updated conversation data interface
export interface ConversationData {
  // Base fields (always present)
  outreach_type: 'sales' | 'recruiting';
  user_title: string;
  user_company: string; 
  user_mission: string;
  
  // Recruiting-specific
  role_title?: string;
  skills?: string;
  experience_level?: string;
  
  // Sales-specific  
  buyer_title?: string;
  pain_point?: string;
  
  // Shared fields
  company_size?: string;
  industry?: string;
  location?: string;
}

// Enhanced candidate interface
export interface Candidate {
  id: string;
  first_name: string;
  full_name: string;
  work_email: string;
  job_title?: string;
  job_company_name?: string;
  job_company_size?: string;
  job_company_industry?: string;
  linkedin_url?: string;
  location_name?: string;
  skills?: string[];
  experience_years?: number;
  relevance_score?: number;
}

// PDL canonical value mappings
const EXPERIENCE_LEVEL_MAPPING: Record<string, string[]> = {
  'entry': ['entry', 'training'],
  'junior': ['entry', 'training', 'manager'],
  'mid': ['manager', 'senior'],
  'senior': ['senior', 'director'],
  'lead': ['senior', 'director', 'vp'],
  'principal': ['director', 'vp'],
  'staff': ['director', 'vp'],
  'director': ['director', 'vp'],
  'vp': ['vp', 'cxo'],
  'executive': ['cxo'],
  'c-level': ['cxo']
};

const COMPANY_SIZE_MAPPING: Record<string, string[]> = {
  'startup': ['1-10', '11-50'],
  'small': ['11-50', '51-200'],
  'mid-sized': ['201-500', '501-1000'],
  'medium': ['201-500', '501-1000'],
  'large': ['1001-5000', '5001-10000'],
  'enterprise': ['10001+'],
  'big tech': ['10001+'],
  'fortune 500': ['10001+']
};

const INDUSTRY_MAPPINGS: Record<string, string[]> = {
  'saas': ['computer software', 'internet', 'information technology and services'],
  'fintech': ['financial services', 'banking', 'insurance', 'investment banking'],
  'healthtech': ['hospital & health care', 'medical devices', 'pharmaceuticals'],
  'edtech': ['education management', 'e-learning', 'higher education'],
  'e-commerce': ['retail', 'internet', 'consumer goods'],
  'ai': ['computer software', 'artificial intelligence', 'machine learning'],
  'crypto': ['financial services', 'blockchain', 'cryptocurrency']
};

// Enhanced job title expansion for graduated matching
const JOB_TITLE_EXPANSIONS: Record<string, Array<{title: string, boost: number}>> = {
  'software engineer': [
    { title: 'software engineer', boost: 10 },
    { title: 'software developer', boost: 9 },
    { title: 'developer', boost: 8 },
    { title: 'programmer', boost: 7 },
    { title: 'engineer', boost: 5 },
    { title: 'full stack developer', boost: 6 }
  ],
  'frontend developer': [
    { title: 'frontend developer', boost: 10 },
    { title: 'front-end developer', boost: 10 },
    { title: 'ui developer', boost: 9 },
    { title: 'react developer', boost: 9 },
    { title: 'javascript developer', boost: 8 },
    { title: 'web developer', boost: 7 },
    { title: 'software engineer', boost: 5 }
  ],
  'backend developer': [
    { title: 'backend developer', boost: 10 },
    { title: 'back-end developer', boost: 10 },
    { title: 'server developer', boost: 9 },
    { title: 'api developer', boost: 9 },
    { title: 'software engineer', boost: 5 }
  ],
  'data scientist': [
    { title: 'data scientist', boost: 10 },
    { title: 'machine learning engineer', boost: 9 },
    { title: 'data analyst', boost: 8 },
    { title: 'ai researcher', boost: 7 },
    { title: 'data engineer', boost: 6 }
  ],
  'product manager': [
    { title: 'product manager', boost: 10 },
    { title: 'senior product manager', boost: 9 },
    { title: 'product owner', boost: 8 },
    { title: 'product lead', boost: 7 }
  ],
  'marketing manager': [
    { title: 'marketing manager', boost: 10 },
    { title: 'digital marketing manager', boost: 9 },
    { title: 'growth manager', boost: 8 },
    { title: 'marketing lead', boost: 7 },
    { title: 'marketing director', boost: 6 }
  ],
  'sales manager': [
    { title: 'sales manager', boost: 10 },
    { title: 'account manager', boost: 9 },
    { title: 'business development manager', boost: 8 },
    { title: 'sales director', boost: 7 }
  ]
};

interface PDLResponse {
  status: number;
  data: Array<{
    id: string;
    first_name?: string;
    full_name?: string;
    work_email?: string;
    job_title?: string;
    job_company_name?: string;
    job_company_size?: string;
    job_company_industry?: string;
    linkedin_url?: string;
    location_name?: string;
    skills?: string[];
    inferred_years_experience?: number;
    [key: string]: any;
  }>;
  scroll_token?: string;
  total: number;
}

export class PDLService {
  /**
   * Main entry point: convert conversation to optimal single PDL search
   * This replaces both searchFromConversation and ensureMinimumCandidates
   */
  static async searchFromConversation(
    conversationData: ConversationData,
    maxCandidates: number = 50
  ): Promise<Candidate[]> {
    try {
      console.log('Converting conversation data to smart single PDL query:', conversationData);
      
      // Build comprehensive single query with graduated matching
      const elasticsearchQuery = this.buildComprehensiveQuery(conversationData);
      
      console.log('Generated comprehensive PDL query:', JSON.stringify(elasticsearchQuery, null, 2));
      
      // Execute single search - always returns results due to graduated matching
      const response = await this.executeSearch(elasticsearchQuery, conversationData, maxCandidates);
      
      // Parse and score results
      const candidates = this.parseAndScoreResults(response, conversationData);
      
      console.log(`Found ${candidates.length} candidates out of ${response.total} total matches using single API call`);
      return candidates;
      
    } catch (error) {
      console.error('Error in searchFromConversation:', error);
      throw new Error('Failed to search candidates from conversation data');
    }
  }

  /**
   * Build comprehensive single query with graduated matching
   * This ensures we always get results while prioritizing exact matches
   */
  private static buildComprehensiveQuery(data: ConversationData): object {
    const mustClauses: any[] = [];
    const shouldClauses: any[] = [];

    // ALWAYS require work email for outreach
    mustClauses.push({
      exists: { field: "work_email" }
    });

    // GRADUATED JOB TITLE MATCHING (recruiting vs sales)
    if (data.outreach_type === 'recruiting' && data.role_title) {
      const titleClauses = this.buildGraduatedJobTitleQuery(data.role_title, 'recruiting');
      shouldClauses.push(...titleClauses);
    } else if (data.outreach_type === 'sales' && data.buyer_title) {
      const titleClauses = this.buildGraduatedJobTitleQuery(data.buyer_title, 'sales');
      shouldClauses.push(...titleClauses);
    }

    // GRADUATED SKILLS MATCHING (recruiting only)
    if (data.outreach_type === 'recruiting' && data.skills) {
      const skillsClauses = this.buildGraduatedSkillsQuery(data.skills);
      shouldClauses.push(...skillsClauses);
    }

    // EXPERIENCE LEVEL (high boost if specified)
    if (data.experience_level) {
      const expClauses = this.buildGraduatedExperienceQuery(data.experience_level);
      shouldClauses.push(...expClauses);
    }

    // COMPANY SIZE (medium boost)
    if (data.company_size) {
      const sizeClauses = this.buildGraduatedCompanySizeQuery(data.company_size);
      shouldClauses.push(...sizeClauses);
    }

    // INDUSTRY (medium boost, broad fallback)
    if (data.industry) {
      const industryClauses = this.buildGraduatedIndustryQuery(data.industry);
      shouldClauses.push(...industryClauses);
    }

    // LOCATION (medium boost, optional)
    if (data.location && !this.isRemoteLocation(data.location)) {
      const locationClauses = this.buildGraduatedLocationQuery(data.location);
      shouldClauses.push(...locationClauses);
    }

    // PAIN POINT MATCHING (sales only, low boost)
    if (data.outreach_type === 'sales' && data.pain_point) {
      const painClauses = this.buildGraduatedPainPointQuery(data.pain_point);
      shouldClauses.push(...painClauses);
    }

    // BROAD FALLBACK CLAUSES (ensure we always get results)
    shouldClauses.push(...this.buildFallbackClauses(data));

    // Build final comprehensive query
    const finalQuery: any = {
      query: {
        bool: {
          must: mustClauses,
          should: shouldClauses,
          minimum_should_match: 1  // Only need to match ONE criteria
        }
      }
    };

    return finalQuery;
  }

  /**
   * Build graduated job title query with multiple boost levels
   */
  private static buildGraduatedJobTitleQuery(title: string, context: 'recruiting' | 'sales'): any[] {
    const cleanTitle = title.toLowerCase().trim();
    const titleClauses: any[] = [];

    // Get expanded job titles with boost values
    const expansions = this.getJobTitleExpansions(cleanTitle);
    
    expansions.forEach(({ title: expandedTitle, boost }) => {
      // Exact phrase match
      titleClauses.push({
        match_phrase: {
          job_title: {
            query: expandedTitle,
            boost: boost
          }
        }
      });

      // Partial match with slightly lower boost
      titleClauses.push({
        match: {
          job_title: {
            query: expandedTitle,
            boost: boost * 0.8,
            fuzziness: "AUTO"
          }
        }
      });
    });

    // For sales, add seniority indicators
    if (context === 'sales') {
      const seniorityTerms = ['director', 'vp', 'head', 'chief', 'manager', 'lead'];
      seniorityTerms.forEach(term => {
        if (cleanTitle.includes(term)) {
          titleClauses.push({
            match: {
              job_title: {
                query: term,
                boost: 6
              }
            }
          });
        }
      });
    }

    return titleClauses;
  }

  /**
   * Build graduated skills query with priority boosting
   */
  private static buildGraduatedSkillsQuery(skillsString: string): any[] {
    if (!skillsString?.trim()) return [];

    const skills = skillsString
      .split(/[,&]|\sand\s/)
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 1);

    if (skills.length === 0) return [];

    const skillClauses: any[] = [];

    skills.forEach((skill, index) => {
      // Higher boost for earlier skills (more important)
      const boost = Math.max(8 - index, 3);
      
      skillClauses.push({
        match: {
          skills: {
            query: skill,
            boost: boost,
            fuzziness: "AUTO"
          }
        }
      });
    });

    return skillClauses;
  }

  /**
   * Build graduated experience level query
   */
  private static buildGraduatedExperienceQuery(level: string): any[] {
    const cleanLevel = level.toLowerCase().trim();
    const mappedLevels = EXPERIENCE_LEVEL_MAPPING[cleanLevel];
    
    if (!mappedLevels) return [];

    return [{
      terms: {
        job_title_levels: mappedLevels
      },
      boost: 5  // Boost for experience level matches
    }];
  }

  /**
   * Build graduated company size query
   */
  private static buildGraduatedCompanySizeQuery(sizeString: string): any[] {
    const cleanSize = sizeString.toLowerCase().trim();
    const clauses: any[] = [];
    
    // Direct mapping
    const mappedSizes = COMPANY_SIZE_MAPPING[cleanSize];
    if (mappedSizes) {
      clauses.push({
        terms: {
          job_company_size: mappedSizes
        },
        boost: 5  // Boost for company size matches
      });
    }

    // Extract numbers from free text
    const numberMatch = sizeString.match(/(\d+)[-\s]*(\d+)?/);
    if (numberMatch) {
      const min = parseInt(numberMatch[1]);
      const max = numberMatch[2] ? parseInt(numberMatch[2]) : min * 10;
      
      const sizeRanges = this.getSizeRangesForNumbers(min, max);
      if (sizeRanges.length > 0) {
        clauses.push({
          terms: {
            job_company_size: sizeRanges
          },
          boost: 5  // Boost for company size range matches
        });
      }
    }

    return clauses;
  }

  /**
   * Build graduated industry query with broad fallbacks
   */
  private static buildGraduatedIndustryQuery(industryString: string): any[] {
    const cleanIndustry = industryString.toLowerCase().trim();
    const industryClauses: any[] = [];
    
    // Check for mapped industries (high boost)
    const mappedIndustries = INDUSTRY_MAPPINGS[cleanIndustry];
    if (mappedIndustries) {
      mappedIndustries.forEach(industry => {
        industryClauses.push({
          match: {
            job_company_industry: {
              query: industry,
              boost: 6
            }
          }
        });
      });
    }

    // Direct match (medium boost)
    industryClauses.push({
      match: {
        job_company_industry: {
          query: cleanIndustry,
          boost: 4,
          fuzziness: "AUTO"
        }
      }
    });

    return industryClauses;
  }

  /**
   * Build graduated location query
   */
  private static buildGraduatedLocationQuery(locationString: string): any[] {
    const cleanLocation = locationString.toLowerCase().trim();
    const locationClauses: any[] = [];

    // City/region match (highest boost)
    locationClauses.push({
      match: {
        location_name: {
          query: cleanLocation,
          boost: 8,
          fuzziness: "AUTO"
        }
      }
    });

    // Region/state match (medium boost)
    locationClauses.push({
      match: {
        location_region: {
          query: cleanLocation,
          boost: 6
        }
      }
    });

    // Country match (lower boost)
    locationClauses.push({
      match: {
        location_country: {
          query: cleanLocation,
          boost: 4
        }
      }
    });

    return locationClauses;
  }

  /**
   * Build graduated pain point query for sales
   */
  private static buildGraduatedPainPointQuery(painPoint: string): any[] {
    const keyTerms = painPoint.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3)
      .slice(0, 5);

    if (keyTerms.length === 0) return [];

    return keyTerms.map(term => ({
      match: {
        job_company_industry: {
          query: term,
          boost: 2
        }
      }
    }));
  }

  /**
   * Build broad fallback clauses to ensure results
   */
  private static buildFallbackClauses(data: ConversationData): any[] {
    const fallbackClauses: any[] = [];

    // Industry-based fallbacks
    if (data.industry) {
      const mappedIndustries = INDUSTRY_MAPPINGS[data.industry.toLowerCase()];
      if (mappedIndustries) {
        mappedIndustries.forEach(industry => {
          fallbackClauses.push({
            match: {
              job_company_industry: {
                query: industry,
                boost: 1
              }
            }
          });
        });
      }
    }

    // General tech fallbacks for recruiting
    if (data.outreach_type === 'recruiting') {
      fallbackClauses.push(
        {
          match: {
            job_company_industry: {
              query: "computer software",
              boost: 1
            }
          }
        },
        {
          match: {
            job_company_industry: {
              query: "information technology",
              boost: 1
            }
          }
        }
      );
    }

    // General business fallbacks for sales
    if (data.outreach_type === 'sales') {
      fallbackClauses.push(
        {
          terms: {
            job_title_levels: {
              value: ["manager", "director", "vp", "cxo"],
              boost: 1
            }
          }
        }
      );
    }

    return fallbackClauses;
  }

  /**
   * Check if location is remote
   */
  private static isRemoteLocation(location: string): boolean {
    const cleanLocation = location.toLowerCase().trim();
    return cleanLocation.includes('remote') || 
           cleanLocation.includes('global') || 
           cleanLocation.includes('anywhere');
  }

  /**
   * Execute search with optimal dataset selection
   */
  private static async executeSearch(
    query: object,
    data: ConversationData,
    maxCandidates: number
  ): Promise<PDLResponse> {
    
    // Choose optimal dataset based on outreach type
    const dataset = data.outreach_type === 'recruiting' ? 'resume,email' : 'email';
    
    const requestBody = {
      ...query,
      size: Math.min(maxCandidates, 100),
      dataset,
      data_include: 'first_name,full_name,work_email,job_title,job_company_name,job_company_size,job_company_industry,linkedin_url,location_name,skills,inferred_years_experience',
      titlecase: true
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

    const data_response: PDLResponse = await response.json();
    
    if (data_response.status !== 200) {
      console.error('PDL API returned error:', data_response);
      throw new Error(`PDL API error: ${JSON.stringify(data_response)}`);
    }

    return data_response;
  }

  /**
   * Parse results and add relevance scoring
   */
  private static parseAndScoreResults(
    response: PDLResponse,
    conversationData: ConversationData
  ): Candidate[] {
    if (!response.data || response.data.length === 0) {
      return [];
    }

    const candidates: Candidate[] = [];

    for (const person of response.data) {
      // Skip if missing essential fields
      if (!person.first_name || !person.work_email || !this.isValidEmail(person.work_email)) {
        continue;
      }

      const candidate: Candidate = {
        id: person.id,
        first_name: person.first_name,
        full_name: person.full_name || person.first_name,
        work_email: person.work_email,
        job_title: person.job_title,
        job_company_name: person.job_company_name,
        job_company_size: person.job_company_size,
        job_company_industry: person.job_company_industry,
        linkedin_url: person.linkedin_url,
        location_name: person.location_name,
        skills: person.skills,
        experience_years: person.inferred_years_experience,
        relevance_score: this.calculateRelevanceScore(person, conversationData)
      };

      candidates.push(candidate);
    }

    // Sort by relevance score (PDL already returns by relevance, but our scoring adds more context)
    candidates.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    console.log(`Parsed ${candidates.length} valid candidates`);
    return candidates;
  }

  /**
   * Calculate relevance score for ranking
   */
  private static calculateRelevanceScore(person: any, data: ConversationData): number {
    let score = 0;

    // Job title match
    const targetTitle = data.outreach_type === 'recruiting' ? data.role_title : data.buyer_title;
    if (targetTitle && person.job_title) {
      const titleSimilarity = this.calculateTitleSimilarity(person.job_title, targetTitle);
      score += titleSimilarity * 40;
    }

    // Skills match (recruiting only)
    if (data.outreach_type === 'recruiting' && data.skills && person.skills) {
      const skillsMatch = this.calculateSkillsMatch(person.skills, data.skills);
      score += skillsMatch * 30;
    }

    // Company size match
    if (data.company_size && person.job_company_size) {
      const sizeMatch = this.calculateSizeMatch(person.job_company_size, data.company_size);
      score += sizeMatch * 15;
    }

    // Industry match
    if (data.industry && person.job_company_industry) {
      const industryMatch = this.calculateIndustryMatch(person.job_company_industry, data.industry);
      score += industryMatch * 15;
    }

    return Math.round(score);
  }

  // Helper methods for scoring (unchanged)
  private static calculateTitleSimilarity(personTitle: string, targetTitle: string): number {
    const person = personTitle.toLowerCase();
    const target = targetTitle.toLowerCase();
    
    if (person === target) return 1.0;
    if (person.includes(target) || target.includes(person)) return 0.8;
    
    const personWords = person.split(/\s+/);
    const targetWords = target.split(/\s+/);
    const commonWords = personWords.filter(word => targetWords.includes(word));
    
    return commonWords.length / Math.max(personWords.length, targetWords.length);
  }

  private static calculateSkillsMatch(personSkills: string[], targetSkills: string): number {
    if (!personSkills || personSkills.length === 0) return 0;
    
    const targetArray = targetSkills.toLowerCase().split(/[,&]|\sand\s/).map(s => s.trim());
    const personArray = personSkills.map(s => s.toLowerCase());
    
    const matches = targetArray.filter(skill => 
      personArray.some(pSkill => pSkill.includes(skill) || skill.includes(pSkill))
    );
    
    return matches.length / targetArray.length;
  }

  private static calculateSizeMatch(personSize: string, targetSize: string): number {
    return personSize.toLowerCase().includes(targetSize.toLowerCase()) ? 1.0 : 0.0;
  }

  private static calculateIndustryMatch(personIndustry: string, targetIndustry: string): number {
    const person = personIndustry.toLowerCase();
    const target = targetIndustry.toLowerCase();
    
    if (person.includes(target) || target.includes(person)) return 1.0;
    
    const mappedIndustries = INDUSTRY_MAPPINGS[target];
    if (mappedIndustries && mappedIndustries.some((industry: string) => person.includes(industry.toLowerCase()))) {
      return 0.8;
    }
    
    return 0.0;
  }

  // Utility methods
  private static getJobTitleExpansions(title: string): Array<{title: string, boost: number}> {
    const cleanTitle = title.toLowerCase().trim();
    const expansions = JOB_TITLE_EXPANSIONS[cleanTitle];
    return expansions || [{ title: title, boost: 10 }];
  }

  private static getSizeRangesForNumbers(min: number, max: number): string[] {
    const ranges: string[] = [];
    
    if (min <= 10) ranges.push('1-10');
    if (min <= 50 && max >= 11) ranges.push('11-50');
    if (min <= 200 && max >= 51) ranges.push('51-200');
    if (min <= 500 && max >= 201) ranges.push('201-500');
    if (min <= 1000 && max >= 501) ranges.push('501-1000');
    if (min <= 5000 && max >= 1001) ranges.push('1001-5000');
    if (min <= 10000 && max >= 5001) ranges.push('5001-10000');
    if (max > 10000) ranges.push('10001+');
    
    return ranges;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test connection method
   */
  static async testConnection(): Promise<boolean> {
    try {
      const testQuery = {
        query: {
          bool: {
            must: [
              { match: { job_title: "engineer" } },
              { exists: { field: "work_email" } }
            ]
          }
        }
      };

      const response = await this.executeSearch(testQuery, { 
        outreach_type: 'recruiting',
        user_title: 'test',
        user_company: 'test',
        user_mission: 'test'
      } as ConversationData, 1);
      
      console.log(`PDL connection test successful. Found ${response.total} matching records.`);
      return true;
      
    } catch (error) {
      console.error('PDL connection test failed:', error);
      return false;
    }
  }
}