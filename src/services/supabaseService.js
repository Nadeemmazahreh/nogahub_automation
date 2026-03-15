/**
 * Supabase Service Layer
 *
 * This service provides a similar API to the old apiService.js,
 * but uses Supabase queries instead of REST API calls.
 * This makes migration easier by keeping the same interface.
 */

import { supabase, Tables, handleSupabaseError } from '../lib/supabase';
import * as simpleAuth from '../utils/simpleAuth';

class SupabaseService {
  // ==========================================
  // AUTHENTICATION METHODS
  // ==========================================

  /**
   * Register a new user
   */
  async register(userData) {
    try {
      const { email, password, username } = userData;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role: 'user' // Default role
          }
        }
      });

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        message: 'Registration successful'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials) {
    try {
      console.log('🔐 [SupabaseService] Login called with email:', credentials.email);
      const { email, password } = credentials;

      console.log('🔑 [SupabaseService] Calling signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('✅ [SupabaseService] signInWithPassword response:', { data: !!data, error: !!error });

      if (error) {
        console.error('❌ [SupabaseService] Auth error:', error);
        throw error;
      }

      console.log('👤 [SupabaseService] User authenticated, ID:', data.user.id);
      console.log('📝 [SupabaseService] Fetching user profile from table:', Tables.USERS);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from(Tables.USERS)
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('✅ [SupabaseService] Profile query response:', { profile: !!profile, profileError: !!profileError });

      if (profileError) {
        console.error('❌ [SupabaseService] Profile error:', profileError);
        throw new Error('User profile not found. Please contact administrator.');
      }

      if (!profile) {
        console.error('❌ [SupabaseService] Profile is null/undefined');
        throw new Error('User profile not found in database. Please contact administrator.');
      }

      console.log('✅ [SupabaseService] Profile found:', profile);
      console.log('✅ [SupabaseService] Returning success response');

      return {
        success: true,
        user: {
          ...data.user,
          profile
        },
        session: data.session,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('❌ [SupabaseService] Login error:', error);
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from(Tables.USERS)
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      return {
        success: true,
        user: {
          ...user,
          ...profile
        }
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Refresh authentication session
   */
  async refreshToken() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      return {
        success: true,
        session: data.session
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  /**
   * Validate current token
   */
  async validateToken() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  // ==========================================
  // EQUIPMENT METHODS
  // ==========================================

  /**
   * Transform equipment data from snake_case (database) to camelCase (frontend)
   */
  _transformEquipmentFromDB(equipment) {
    if (!equipment) return null;

    return {
      ...equipment,
      dealerUSD: equipment.dealer_usd,
      msrpUSD: equipment.msrp_usd,
      equipmentType: equipment.equipment_type,
      isActive: equipment.is_active,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at
    };
  }

  /**
   * Get all equipment
   */
  async getEquipment(params = {}) {
    try {
      let query = supabase
        .from(Tables.EQUIPMENT)
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      // Apply filters if provided
      if (params.category) {
        query = query.eq('category', params.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = data.map(item => this._transformEquipmentFromDB(item));

      return {
        success: true,
        equipment: transformedData,
        count: transformedData.length
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(id) {
    try {
      const { data, error } = await supabase
        .from(Tables.EQUIPMENT)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = this._transformEquipmentFromDB(data);

      return {
        success: true,
        equipment: transformedData
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create new equipment (admin only)
   */
  async createEquipment(equipmentData) {
    try {
      const { data, error } = await supabase
        .from(Tables.EQUIPMENT)
        .insert([{
          code: equipmentData.code,
          name: equipmentData.name,
          msrp_usd: equipmentData.msrpUSD,
          dealer_usd: equipmentData.dealerUSD,
          weight: equipmentData.weight,
          category: equipmentData.category,
          equipment_type: equipmentData.equipmentType,
          is_active: equipmentData.isActive ?? true
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = this._transformEquipmentFromDB(data);

      return {
        success: true,
        equipment: transformedData,
        message: 'Equipment created successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Update equipment (admin only)
   */
  async updateEquipment(id, equipmentData) {
    try {
      const { data, error } = await supabase
        .from(Tables.EQUIPMENT)
        .update({
          code: equipmentData.code,
          name: equipmentData.name,
          msrp_usd: equipmentData.msrpUSD,
          dealer_usd: equipmentData.dealerUSD,
          weight: equipmentData.weight,
          category: equipmentData.category,
          equipment_type: equipmentData.equipmentType,
          is_active: equipmentData.isActive
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = this._transformEquipmentFromDB(data);

      return {
        success: true,
        equipment: transformedData,
        message: 'Equipment updated successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete equipment (admin only)
   */
  async deleteEquipment(id) {
    try {
      const { error } = await supabase
        .from(Tables.EQUIPMENT)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Equipment deleted successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get equipment categories
   */
  async getEquipmentCategories() {
    try {
      const { data, error } = await supabase
        .from(Tables.EQUIPMENT)
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map(item => item.category))];

      return {
        success: true,
        categories
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  // ==========================================
  // PROJECT METHODS
  // ==========================================

  /**
   * Get user ID from simpleAuth email lookup
   * Since we're using environment-based auth, we need to look up users by email
   */
  async _getUserIdFromEmail() {
    const currentUser = simpleAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Look up user in database by email
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('id')
      .eq('email', currentUser.email)
      .single();

    if (error || !user) {
      throw new Error('User not found in database');
    }

    return user.id;
  }

  /**
   * Transform project data from snake_case (database) to camelCase (frontend)
   */
  _transformProjectFromDB(project) {
    if (!project) return null;

    return {
      ...project,
      projectName: project.project_name,
      clientName: project.client_name,
      projectType: project.project_type,
      globalDiscount: project.global_discount,
      includeTax: project.include_tax,
      isCalculated: project.is_calculated,
      calculationResults: project.calculation_results,
      customServices: project.custom_services,
      customEquipment: project.custom_equipment,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: project.user_id
    };
  }

  /**
   * Get all projects (filtered by user role)
   */
  async getProjects(params = {}) {
    try {
      let query = supabase
        .from(Tables.PROJECTS)
        .select(`
          *,
          users:user_id (
            id,
            username,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // RLS will automatically filter projects based on user role
      // Users see their own, admins see all

      const { data, error } = await query;

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = data.map(project => this._transformProjectFromDB(project));

      return {
        success: true,
        projects: transformedData,
        count: transformedData.length
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(id) {
    try {
      const { data, error } = await supabase
        .from(Tables.PROJECTS)
        .select(`
          *,
          users:user_id (
            id,
            username,
            email,
            role
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform data from snake_case to camelCase
      const transformedData = this._transformProjectFromDB(data);

      return {
        success: true,
        project: transformedData
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Create new project
   */
  async createProject(projectData) {
    try {
      // Get current user from simpleAuth session
      const currentUser = simpleAuth.getCurrentUser();
      if (!currentUser) {
        throw new Error('Please log in to save projects');
      }

      // Try to get user_id from database, but don't fail if not found
      let userId = null;
      try {
        userId = await this._getUserIdFromEmail();
      } catch (err) {
        console.warn('Could not get user_id from database, continuing without it');
      }

      const { data, error } = await supabase
        .from(Tables.PROJECTS)
        .insert([{
          user_id: userId,
          created_by_username: currentUser.username,
          created_by_email: currentUser.email,
          created_by_role: currentUser.role,
          project_name: projectData.projectName,
          client_name: projectData.clientName,
          equipment: projectData.equipment || [],
          services: projectData.services || {},
          custom_services: projectData.customServices || [],
          custom_equipment: projectData.customEquipment || [],
          roles: projectData.roles || {},
          global_discount: projectData.globalDiscount || 0,
          total: projectData.total || 0,
          include_tax: projectData.includeTax ?? true,
          terms: projectData.terms || '',
          is_calculated: projectData.isCalculated || false,
          calculation_results: projectData.calculationResults || null,
          project_type: projectData.projectType || null
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        project: data,
        message: 'Project created successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Save project (create or update)
   */
  async saveProject(projectData) {
    if (projectData.id) {
      return this.updateProject(projectData.id, projectData);
    } else {
      return this.createProject(projectData);
    }
  }

  /**
   * Update project
   */
  async updateProject(id, projectData) {
    try {
      const { data, error } = await supabase
        .from(Tables.PROJECTS)
        .update({
          project_name: projectData.projectName,
          client_name: projectData.clientName,
          equipment: projectData.equipment,
          services: projectData.services,
          custom_services: projectData.customServices,
          custom_equipment: projectData.customEquipment,
          roles: projectData.roles,
          global_discount: projectData.globalDiscount,
          total: projectData.total,
          include_tax: projectData.includeTax,
          terms: projectData.terms,
          is_calculated: projectData.isCalculated,
          calculation_results: projectData.calculationResults,
          project_type: projectData.projectType
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        project: data,
        message: 'Project updated successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id) {
    try {
      const { error } = await supabase
        .from(Tables.PROJECTS)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats() {
    try {
      const { data: projects, error } = await supabase
        .from(Tables.PROJECTS)
        .select('total, created_at');

      if (error) throw error;

      const stats = {
        totalProjects: projects.length,
        totalValue: projects.reduce((sum, p) => sum + parseFloat(p.total || 0), 0),
        averageValue: projects.length > 0
          ? projects.reduce((sum, p) => sum + parseFloat(p.total || 0), 0) / projects.length
          : 0
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Check database connection
   */
  async checkConnection() {
    try {
      const { error } = await supabase.from(Tables.EQUIPMENT).select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

export default supabaseService;
