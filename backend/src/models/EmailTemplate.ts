import { supabase } from '../config/database';

export interface CreateEmailTemplateData {
  template_name: string;
  template_category: 'professional' | 'casual' | 'direct' | 'warm' | 'follow_up';
  opener_text: string;
  template_variables?: string[];
  is_active?: boolean;
  default_template?: boolean;
}

export interface EmailTemplateProfile {
  id: string;
  template_name: string;
  template_category: string;
  opener_text: string;
  template_variables: string[] | null;
  is_active: boolean;
  default_template: boolean;
  created_at: string;
}

export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  templates_by_category: Record<string, number>;
  most_used_category: string;
}

export class EmailTemplate {
  /**
   * Create a new email template
   */
  static async create(templateData: CreateEmailTemplateData): Promise<EmailTemplateProfile | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{
          template_name: templateData.template_name,
          template_category: templateData.template_category,
          opener_text: templateData.opener_text,
          template_variables: templateData.template_variables || null,
          is_active: templateData.is_active ?? true,
          default_template: templateData.default_template ?? false,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating email template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in EmailTemplate.create:', error);
      return null;
    }
  }

  /**
   * Find template by ID
   */
  static async findById(templateId: string): Promise<EmailTemplateProfile | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in EmailTemplate.findById:', error);
      return null;
    }
  }

  /**
   * Get all active email templates
   */
  static async getActiveTemplates(): Promise<EmailTemplateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name', { ascending: true });

      if (error) {
        console.error('Error fetching active templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in EmailTemplate.getActiveTemplates:', error);
      return [];
    }
  }

  /**
   * Get templates by category
   */
  static async getByCategory(category: string): Promise<EmailTemplateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_category', category)
        .eq('is_active', true)
        .order('template_name', { ascending: true });

      if (error) {
        console.error('Error fetching templates by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in EmailTemplate.getByCategory:', error);
      return [];
    }
  }

  /**
   * Get a random template from a specific category
   */
  static async getRandomTemplate(category?: string): Promise<EmailTemplateProfile | null> {
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('template_category', category);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        console.error('Error fetching random template:', error);
        return null;
      }

      // Select random template from results
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex];
    } catch (error) {
      console.error('Error in EmailTemplate.getRandomTemplate:', error);
      return null;
    }
  }

  /**
   * Get all templates (including inactive)
   */
  static async getAllTemplates(): Promise<EmailTemplateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_category', { ascending: true })
        .order('template_name', { ascending: true });

      if (error) {
        console.error('Error fetching all templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in EmailTemplate.getAllTemplates:', error);
      return [];
    }
  }

  /**
   * Update template content
   */
  static async updateTemplate(templateId: string, updates: {
    template_name?: string;
    template_category?: string;
    opener_text?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) {
        console.error('Error updating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in EmailTemplate.updateTemplate:', error);
      return false;
    }
  }

  /**
   * Toggle template active status
   */
  static async toggleActive(templateId: string): Promise<boolean> {
    try {
      // First get current status
      const template = await this.findById(templateId);
      if (!template) return false;

      const { error } = await supabase
        .from('email_templates')
        .update({
          is_active: !template.is_active,
        })
        .eq('id', templateId);

      if (error) {
        console.error('Error toggling template status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in EmailTemplate.toggleActive:', error);
      return false;
    }
  }

  /**
   * Activate template
   */
  static async activate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          is_active: true,
        })
        .eq('id', templateId);

      if (error) {
        console.error('Error activating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in EmailTemplate.activate:', error);
      return false;
    }
  }

  /**
   * Deactivate template
   */
  static async deactivate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          is_active: false,
        })
        .eq('id', templateId);

      if (error) {
        console.error('Error deactivating template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in EmailTemplate.deactivate:', error);
      return false;
    }
  }

  /**
   * Delete template
   */
  static async delete(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in EmailTemplate.delete:', error);
      return false;
    }
  }

  /**
   * Search templates by name or content
   */
  static async search(query: string): Promise<EmailTemplateProfile[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .or(`template_name.ilike.%${query}%,opener_text.ilike.%${query}%`)
        .order('template_name', { ascending: true });

      if (error) {
        console.error('Error searching templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in EmailTemplate.search:', error);
      return [];
    }
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(): Promise<TemplateStats> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('template_category, is_active');

      if (error || !data) {
        console.error('Error fetching template stats:', error);
        return this.getEmptyStats();
      }

      const stats = data.reduce((acc, template) => {
        acc.total_templates += 1;
        if (template.is_active) acc.active_templates += 1;
        
        const category = template.template_category;
        acc.templates_by_category[category] = (acc.templates_by_category[category] || 0) + 1;
        
        return acc;
      }, this.getEmptyStats());

      // Find most used category
      let maxCount = 0;
      let mostUsedCategory = '';
      for (const [category, count] of Object.entries(stats.templates_by_category)) {
        if (count > maxCount) {
          maxCount = count;
          mostUsedCategory = category;
        }
      }
      stats.most_used_category = mostUsedCategory;

      return stats;
    } catch (error) {
      console.error('Error in EmailTemplate.getTemplateStats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get available template categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('template_category')
        .eq('is_active', true);

      if (error || !data) {
        console.error('Error fetching categories:', error);
        return [];
      }

      // Get unique categories
      const categories = [...new Set(data.map(item => item.template_category))];
      return categories.sort();
    } catch (error) {
      console.error('Error in EmailTemplate.getCategories:', error);
      return [];
    }
  }

  /**
   * Bulk create templates
   */
  static async createBatch(templatesData: CreateEmailTemplateData[]): Promise<EmailTemplateProfile[]> {
    try {
      const templatesToInsert = templatesData.map(templateData => ({
        template_name: templateData.template_name,
        template_category: templateData.template_category,
        opener_text: templateData.opener_text,
        is_active: templateData.is_active ?? true,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('email_templates')
        .insert(templatesToInsert)
        .select();

      if (error) {
        console.error('Error creating templates batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in EmailTemplate.createBatch:', error);
      return [];
    }
  }

  /**
   * Check if template name exists
   */
  static async nameExists(templateName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id')
        .eq('template_name', templateName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking template name existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in EmailTemplate.nameExists:', error);
      return false;
    }
  }

  /**
   * Helper to get empty stats object
   */
  private static getEmptyStats(): TemplateStats {
    return {
      total_templates: 0,
      active_templates: 0,
      templates_by_category: {},
      most_used_category: '',
    };
  }
}