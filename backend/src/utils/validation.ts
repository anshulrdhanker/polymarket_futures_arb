import { ConversationData, ValidationError, ValidationResult } from '../services/queueTypes';

/**
 * Validates conversation data for campaign creation
 */
export function validateConversationData(data: Partial<ConversationData>): ValidationResult {
  const errors: ValidationError[] = [];
  const requiredFields: Array<keyof ConversationData> = [
    'recruiter_title',
    'recruiter_company',
    'recruiter_mission',
    'role_title',
    'skills',
    'experience_level'
  ];

  // Check required fields
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !(data[field] as string).trim())) {
      errors.push({
        field,
        code: 'REQUIRED_FIELD',
        message: `${field.replace('_', ' ')} is required`,
        received: data[field]
      });
    }
  });

  // Validate experience level enum
  if (data.experience_level && !isValidExperienceLevel(data.experience_level)) {
    errors.push({
      field: 'experience_level',
      code: 'INVALID_VALUE',
      message: 'Experience level must be one of: junior, mid, senior, lead',
      received: data.experience_level
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates if the experience level is one of the allowed values
 */
function isValidExperienceLevel(level: string): level is 'junior' | 'mid' | 'senior' | 'lead' {
  return ['junior', 'mid', 'senior', 'lead'].includes(level);
}

/**
 * Validates the complete campaign creation request
 */
export function validateCampaignRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required top-level fields
  if (!data.conversationData) {
    errors.push({
      field: 'conversationData',
      code: 'REQUIRED_FIELD',
      message: 'conversationData is required',
      received: data.conversationData
    });
    
    return { isValid: false, errors };
  }

  // Validate conversation data
  const conversationValidation = validateConversationData(data.conversationData);
  
  // Validate name if provided
  if (data.name && typeof data.name !== 'string') {
    errors.push({
      field: 'name',
      code: 'INVALID_TYPE',
      message: 'Name must be a string',
      received: typeof data.name
    });
  }

  return {
    isValid: conversationValidation.isValid && errors.length === 0,
    errors: [...errors, ...conversationValidation.errors]
  };
}

/**
 * Formats validation errors for API responses
 */
export function formatValidationErrors(errors: ValidationError[]) {
  return {
    error: 'VALIDATION_ERROR',
    message: 'One or more validation errors occurred',
    details: errors
  };
}
