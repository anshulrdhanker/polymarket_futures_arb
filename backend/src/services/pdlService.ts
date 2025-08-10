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


// Location normalization mapping for common location formats to PDL canonical fields
const LOCATION_NORMALIZATION: Record<string, {city?: string, region?: string, country?: string, metro?: string}> = {
  // US Cities
  'new york': { city: 'New York', region: 'New York', country: 'United States', metro: 'New York City Metro Area' },
  'nyc': { city: 'New York', region: 'New York', country: 'United States', metro: 'New York City Metro Area' },
  'san francisco': { city: 'San Francisco', region: 'California', country: 'United States', metro: 'San Francisco Bay Area' },
  'sf': { city: 'San Francisco', region: 'California', country: 'United States', metro: 'San Francisco Bay Area' },
  'bay area': { region: 'California', country: 'United States', metro: 'San Francisco Bay Area' },
  'los angeles': { city: 'Los Angeles', region: 'California', country: 'United States', metro: 'Greater Los Angeles Area' },
  'la': { city: 'Los Angeles', region: 'California', country: 'United States', metro: 'Greater Los Angeles Area' },
  'seattle': { city: 'Seattle', region: 'Washington', country: 'United States', metro: 'Greater Seattle Area' },
  'boston': { city: 'Boston', region: 'Massachusetts', country: 'United States', metro: 'Greater Boston Area' },
  'chicago': { city: 'Chicago', region: 'Illinois', country: 'United States', metro: 'Greater Chicago Area' },
  'austin': { city: 'Austin', region: 'Texas', country: 'United States', metro: 'Greater Austin Area' },
  'denver': { city: 'Denver', region: 'Colorado', country: 'United States', metro: 'Denver Metro Area' },
  
  // US States
  'california': { region: 'California', country: 'United States' },
  'texas': { region: 'Texas', country: 'United States' },
  'florida': { region: 'Florida', country: 'United States' },
  'washington': { region: 'Washington', country: 'United States' },
  
  // Countries
  'usa': { country: 'United States' },
  'united states': { country: 'United States' },
  'canada': { country: 'Canada' },
  'uk': { country: 'United Kingdom' },
  'united kingdom': { country: 'United Kingdom' },
  'germany': { country: 'Germany' },
  'france': { country: 'France' },
  'australia': { country: 'Australia' },
  'india': { country: 'India' },
  'singapore': { country: 'Singapore' }
};

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
 'startup': ['1-10', '11-200'],
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
};

// Enhanced job title expansions for broader matching
const JOB_TITLE_EXPANSIONS: Record<string, Array<{title: string, boost: number}>> = {
  // VP Sales variations
  'vp sales': [
    { title: 'vice president of sales', boost: 1.0 },
    { title: 'vp of sales', boost: 1.0 },
    { title: 'vice president sales', boost: 0.9 },
    { title: 'sales vp', boost: 0.9 },
    { title: 'head of sales', boost: 0.85 },
    { title: 'director of sales', boost: 0.8 },
    { title: 'sales director', boost: 0.8 },
    { title: 'chief revenue officer', boost: 0.75 },
    { title: 'cro', boost: 0.7 },
    { title: 'chief sales officer', boost: 0.7 },
    { title: 'cso', boost: 0.65 },
    { title: 'sales leader', boost: 0.6 },
    { title: 'revenue leader', boost: 0.6 },
    { title: 'sales executive', boost: 0.5 },
    { title: 'business development executive', boost: 0.4 }
  ],
  'vp of sales': [
    { title: 'vice president of sales', boost: 1.0 },
    { title: 'vp of sales', boost: 1.0 },
    { title: 'vice president sales', boost: 0.9 },
    { title: 'sales vp', boost: 0.9 },
    { title: 'head of sales', boost: 0.85 },
    { title: 'director of sales', boost: 0.8 },
    { title: 'sales director', boost: 0.8 },
    { title: 'chief revenue officer', boost: 0.75 },
    { title: 'cro', boost: 0.7 },
    { title: 'chief sales officer', boost: 0.7 },
    { title: 'cso', boost: 0.65 },
    { title: 'sales leader', boost: 0.6 },
    { title: 'revenue leader', boost: 0.6 },
    { title: 'sales executive', boost: 0.5 },
    { title: 'business development executive', boost: 0.4 }
  ],
  // VP Engineering variations
  'vp engineering': [
    { title: 'vp of engineering', boost: 1.0 },
    { title: 'vice president of engineering', boost: 1.0 },
    { title: 'engineering vp', boost: 0.9 },
    { title: 'head of engineering', boost: 0.9 },
    { title: 'director of engineering', boost: 0.8 },
    { title: 'engineering director', boost: 0.8 },
    { title: 'cto', boost: 0.7 }
  ],
  'vp of engineering': [
    { title: 'vp of engineering', boost: 1.0 },
    { title: 'vice president of engineering', boost: 1.0 },
    { title: 'engineering vp', boost: 0.9 },
    { title: 'head of engineering', boost: 0.9 },
    { title: 'director of engineering', boost: 0.8 },
    { title: 'engineering director', boost: 0.8 },
    { title: 'cto', boost: 0.7 }
  ],
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
   maxCandidates: number = 1
 ): Promise<Candidate[]> {
   try {
     console.log('Converting conversation data to smart single PDL query:', conversationData);
    
     // Build comprehensive single query with graduated matching
     const elasticsearchQuery = this.buildComprehensiveQuery(conversationData);
    
     // Validate and trim query to prevent oversized requests
     const validatedQuery = this.validateAndTrimQuery(elasticsearchQuery);
    
     console.log('Generated comprehensive PDL query:', JSON.stringify(validatedQuery, null, 2));
    
     // Execute single search with retry logic - always returns results due to graduated matching
     const response = await this.executeSearchWithRetry(validatedQuery, conversationData, maxCandidates);
    
     // Parse and score results
     const candidates = this.parseAndScoreResults(response, conversationData);
    
     // Enhanced empty results handling
     if (candidates.length === 0) {
       console.warn('No valid candidates found with current criteria.');
       console.warn('Suggestions to broaden search:');
       console.warn('- Remove location restrictions');
       console.warn('- Broaden experience level requirements');
       console.warn('- Consider related job titles or industries');
      
       // You could implement auto-broadening logic here in future iterations
       // For now, we'll return empty array and let the UI handle this gracefully
     } else {
       console.log(`Found ${candidates.length} candidates out of ${response.total} total matches using single API call`);
     }
    
     return candidates;
    
   } catch (error) {
     console.error('Error in searchFromConversation:', error);
     throw new Error('Failed to search candidates from conversation data');
   }
 }


 /**
  * Execute search with retry logic for rate limiting
  */
 private static async executeSearchWithRetry(
   query: object,
   data: ConversationData,
   maxCandidates: number,
   retries: number = 3
 ): Promise<PDLResponse> {
   for (let i = 0; i < retries; i++) {
     try {
       const response = await this.executeSearch(query, data, maxCandidates);
       return response;
     } catch (error: any) {
       // Check if it's a rate limiting error (429 status)
       if (error.message?.includes('429') && i < retries - 1) {
         const backoffDelay = (i + 1) * 1000; // Exponential backoff: 1s, 2s, 3s
         console.warn(`Rate limited by PDL API. Retrying in ${backoffDelay}ms... (attempt ${i + 1}/${retries})`);
         await new Promise(resolve => setTimeout(resolve, backoffDelay));
         continue;
       }
      
       // If it's not a rate limit error or we've exhausted retries, throw the error
       throw error;
     }
   }
   throw new Error('Max retries exceeded for PDL API request');
 }


 /**
  * Validate and trim query to prevent oversized requests
  */
 private static validateAndTrimQuery(query: any, maxClauses: number = 100): any {
   // Deep clone to avoid mutating original
   const validatedQuery = JSON.parse(JSON.stringify(query));
   
   // Handle both query.bool and direct bool structures
   const boolNode = validatedQuery.query?.bool ?? validatedQuery.bool;
   
   if (boolNode?.should && boolNode.should.length > maxClauses) {
     console.warn(`Trimming should clauses from ${boolNode.should.length} to ${maxClauses} to prevent oversized request`);
     boolNode.should = boolNode.should.slice(0, maxClauses);
   }
   
   if (boolNode?.must && boolNode.must.length > maxClauses) {
     console.warn(`Trimming must clauses from ${boolNode.must.length} to ${maxClauses} to prevent oversized request`);
     boolNode.must = boolNode.must.slice(0, maxClauses);
   }
   
   return validatedQuery;
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
     if (titleClauses.length > 0) {
       shouldClauses.push(...titleClauses);
     }
   } else if (data.outreach_type === 'sales' && data.buyer_title) {
     const titleClauses = this.buildGraduatedJobTitleQuery(data.buyer_title, 'sales');
     if (titleClauses.length > 0) {
       shouldClauses.push(...titleClauses);
     }
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


   // Return the query in the correct PDL format
  return {
    query: {
      bool: {
        must: mustClauses,
        should: shouldClauses  // PDL doesn't support minimum_should_match
      }
    }
  };
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
    // Exact phrase match (simplified)
    titleClauses.push({
      match_phrase: {
        job_title: expandedTitle
      }
    });

    // Exact match (simplified)
    titleClauses.push({
      match: {
        job_title: expandedTitle
      }
    });
  });

  // For sales, add seniority indicators (simplified)
  if (context === 'sales') {
    const seniorityTerms = ['director', 'vp', 'head', 'chief', 'manager', 'lead'];
    seniorityTerms.forEach(term => {
      if (cleanTitle.includes(term)) {
        titleClauses.push({
          match: {
            job_title: term
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


   skills.forEach(skill => {
    skillClauses.push({
      match: {
        skills: skill
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
       job_title_levels: mappedLevels,
       boost: 5  // Boost for experience level matches
     }
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
         job_company_size: mappedSizes,
         boost: 5  // Boost for company size matches
       }
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
           job_company_size: sizeRanges,
           boost: 5  // Boost for company size range matches
         }
       });
     }
   }


   return clauses;
 }


 /**
  * Build graduated industry query with broad fallbacks
  */
 private static buildGraduatedIndustryQuery(industryString: string): any[] {
   if (!industryString) return [];
   
   const cleanIndustry = industryString.toLowerCase().trim();
   const industryClauses: any[] = [];
   const seenIndustries = new Set<string>();
   
   // Check for mapped industries
   const mappedIndustries = INDUSTRY_MAPPINGS[cleanIndustry] || [];
   
   // Add mapped industries, avoiding duplicates
   mappedIndustries.forEach(industry => {
     const normalizedIndustry = industry.toLowerCase().trim();
     if (normalizedIndustry && !seenIndustries.has(normalizedIndustry) && normalizedIndustry !== 'ai') {
       seenIndustries.add(normalizedIndustry);
       industryClauses.push({
         match: {
           job_company_industry: normalizedIndustry
         }
       });
     }
   });
   
   // Add direct match if not already included
   if (cleanIndustry && cleanIndustry !== 'ai' && !seenIndustries.has(cleanIndustry)) {
     industryClauses.push({
       match: {
         job_company_industry: cleanIndustry
       }
     });
   }
   
   // Add broader industry terms if we have specific tech industries
   if (cleanIndustry.includes('tech') || cleanIndustry.includes('software') || 
       cleanIndustry.includes('saas') || cleanIndustry.includes('ai') || 
       cleanIndustry.includes('artificial intelligence')) {
     
     const broaderTerms = [
       'technology', 'information technology', 'it services', 'computer software',
       'internet', 'saas', 'cloud computing', 'artificial intelligence',
       'machine learning', 'data science', 'big data', 'analytics'
     ];
     
     broaderTerms.forEach(term => {
       if (!seenIndustries.has(term)) {
         seenIndustries.add(term);
         industryClauses.push({
           match: {
             job_company_industry: term
           }
         });
       }
     });
   }
   
   return industryClauses;
 }


 /**
  * Build graduated location query
  * Returns an array of match clauses for location_metro and location_name
  * to be used in a bool.should query
  */
 /**
  * Normalize location string to PDL canonical fields
  */
 private static normalizeLocation(locationString: string): {
   city?: string,
   region?: string,
   country?: string,
   metro?: string
 } {
   if (!locationString) return {};
   
   const cleanLocation = locationString.toLowerCase().trim();
   
   // Check for exact matches in our normalization mapping
   if (LOCATION_NORMALIZATION[cleanLocation]) {
     return { ...LOCATION_NORMALIZATION[cleanLocation] };
   }
   
   // Check for partial matches (e.g., "new york, ny" -> { city: "New York", region: "New York" })
   for (const [key, value] of Object.entries(LOCATION_NORMALIZATION)) {
     if (cleanLocation.includes(key)) {
       return { ...value };
     }
   }
   
   // Default case - return as city for exact matching
   return { city: locationString.trim() };
 }

 /**
  * Build graduated location query using normalized location fields
  */
 private static buildGraduatedLocationQuery(locationString: string): any[] {
   if (!locationString) return [];
   
   const normalized = this.normalizeLocation(locationString);
   const locationClauses: any[] = [];
   
   // Exact metro area match (highest priority)
   if (normalized.metro) {
     locationClauses.push({
       match: { 'location_metro': normalized.metro }
     });
   }
   
   // City + region match (high priority)
   if (normalized.city && normalized.region) {
     locationClauses.push({
       bool: {
         must: [
           { match: { 'location_locality': normalized.city } },
           { match: { 'location_region': normalized.region } }
         ]
       }
     });
   }
   
   // City only match (medium priority)
   if (normalized.city) {
     locationClauses.push({
       match: { 'location_locality': normalized.city }
     });
   }
   
   // Region/country match (lower priority)
   if (normalized.region) {
     locationClauses.push({
       match: { 'location_region': normalized.region }
     });
   }
   
   if (normalized.country) {
     locationClauses.push({
       match: { 'location_country': normalized.country }
     });
   }
   
   // Fallback to original location string if no matches found
   if (locationClauses.length === 0) {
     locationClauses.push({
       match: { 'location_name': locationString }
     });
   }
   
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
       job_company_industry: term
     }
   }));
 }


 /**
  * Build broad fallback clauses to ensure results
  */
 private static buildFallbackClauses(data: ConversationData): any[] {
   const fallbackClauses: any[] = [];
   const seenIndustries = new Set<string>();

   // Industry-based fallbacks (deduplicated)
   if (data.industry) {
     const cleanIndustry = data.industry.toLowerCase().trim();
     const mappedIndustries = INDUSTRY_MAPPINGS[cleanIndustry] || [];
     
     // Add mapped industries, avoiding duplicates and 'ai' literal
     mappedIndustries.forEach(industry => {
       const normalizedIndustry = industry.toLowerCase().trim();
       if (normalizedIndustry && normalizedIndustry !== 'ai' && !seenIndustries.has(normalizedIndustry)) {
         seenIndustries.add(normalizedIndustry);
         fallbackClauses.push({
           match: {
             job_company_industry: normalizedIndustry
           }
         });
       }
     });
     
     // Add direct industry match if not already included
     if (cleanIndustry && cleanIndustry !== 'ai' && !seenIndustries.has(cleanIndustry)) {
       fallbackClauses.push({
         match: {
           job_company_industry: cleanIndustry
         }
       });
     }
   }

   // General tech fallbacks for recruiting
   if (data.outreach_type === 'recruiting') {
     fallbackClauses.push(
       {
         match: {
           job_company_industry: "computer software"
         }
       },
       {
         match: {
           job_company_industry: "information technology"
         }
       }
     );
   }

   // General business fallbacks for sales
   if (data.outreach_type === 'sales') {
     fallbackClauses.push(
       {
         terms: {
           job_title_levels: ["manager", "director", "vp", "cxo"]
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
   query: any,
   data: ConversationData,
   maxCandidates: number
 ): Promise<PDLResponse> {
   const startTime = Date.now();
   const PDL_API_KEY = process.env.PDL_API_KEY;
   
   if (!PDL_API_KEY) {
     throw new Error('PDL_API_KEY is not set in environment variables');
   }

   try {
      // The query already contains the full structure, just add the remaining fields
      const requestBody = {
        ...query, // Spread the query which already has the correct structure
        size: Math.min(maxCandidates, 100), // Cap at 100 results max
        data_include: 'first_name,full_name,work_email,job_title,job_company_name,job_company_size,job_company_industry,linkedin_url,location_name,skills,inferred_years_experience',
        titlecase: true
      };
     
     // Log the final request body for debugging
     console.log('Final PDL API request body:', JSON.stringify(requestBody, null, 2));

     console.log('Sending PDL API request:', JSON.stringify(requestBody, null, 2));
     
     const response = await fetch('https://api.peopledatalabs.com/v5/person/search', {
       method: 'POST',
       headers: {
         'X-Api-Key': PDL_API_KEY,
         'Content-Type': 'application/json',
         'Accept': 'application/json'
       },
       body: JSON.stringify(requestBody)
     });

     if (!response.ok) {
       const errorText = await response.text();
       console.error(`PDL API error ${response.status}:`, errorText);
       throw new Error(`PDL API request failed: ${response.status} - ${errorText}`);
     }

     const data_response: PDLResponse = await response.json();
     
     if (!data_response || data_response.status !== 200) {
       console.error('PDL API returned error:', data_response);
       throw new Error(`PDL API error: ${JSON.stringify(data_response)}`);
     }

     console.log(`PDL API call successful: ${Date.now() - startTime}ms, ${data_response.total} results found`);
     return data_response;
     
   } catch (error) {
     console.error(`PDL API call failed after ${Date.now() - startTime}ms:`, error);
     throw error;
   }
 }


 /**
  * Parse results and add relevance scoring
  */
 private static parseAndScoreResults(
   response: PDLResponse,
   conversationData: ConversationData
 ): Candidate[] {
   // Debug: Log raw PDL response data
   console.log("Raw PDL data for debugging:", JSON.stringify(response.data, null, 2));
   
   if (!response.data || response.data.length === 0) {
     console.log("No data in PDL response");
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


   console.log(`Parsed ${candidates.length} valid candidates from ${response.data.length} raw results`);
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
   if (!title) return [];
   
   // First try exact match
   const cleanTitle = title.toLowerCase().trim();
   const exactMatch = JOB_TITLE_EXPANSIONS[cleanTitle];
   if (exactMatch) return exactMatch;
   
   // Then try normalized key (remove 'of', punctuation, and normalize whitespace)
   const normalizedKey = cleanTitle
     .replace(/\bof\b/g, '')   // strip 'of'
     .replace(/[^\w\s]/g, '')  // remove punctuation
     .replace(/\s+/g, ' ')     // normalize whitespace
     .trim();
     
   return JOB_TITLE_EXPANSIONS[normalizedKey] || [{ title: title, boost: 10 }];
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
  * Test connection method with caching and enhanced error handling
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


     const response = await this.executeSearchWithRetry(testQuery, {
       outreach_type: 'recruiting'
     } as ConversationData, 1);
    
     console.log(`PDL connection test successful. Found ${response.total} matching records.`);
     return true;
    
   } catch (error) {
     console.error('PDL connection test failed:', error);
     return false;
   }
 }
}

