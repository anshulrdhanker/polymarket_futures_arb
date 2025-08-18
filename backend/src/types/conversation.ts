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

  // Normalized fields
  normalized_title?: string;
  title_variants?: string[];
  role?: string;
  seniority_levels?: string[];
}
