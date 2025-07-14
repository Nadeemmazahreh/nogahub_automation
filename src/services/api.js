// API Service for NogaHub Backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Debug logging for deployment troubleshooting
console.log('🔗 API_BASE_URL:', API_BASE_URL);
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔧 REACT_APP_API_URL from env:', process.env.REACT_APP_API_URL);

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication token
  getToken() {
    return this.token || localStorage.getItem('authToken');
  }

  // Make authenticated request
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      
      // Handle token expiration
      if (error.message.includes('token') || error.message.includes('401')) {
        this.setToken(null);
        window.location.href = '/login';
      }
      
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async refreshToken() {
    const response = await this.request('/auth/refresh', {
      method: 'POST'
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // Equipment methods
  async getEquipment(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/equipment${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getEquipmentById(id) {
    return this.request(`/equipment/${id}`);
  }

  async createEquipment(equipmentData) {
    return this.request('/equipment', {
      method: 'POST',
      body: JSON.stringify(equipmentData)
    });
  }

  async updateEquipment(id, equipmentData) {
    return this.request(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(equipmentData)
    });
  }

  async deleteEquipment(id) {
    return this.request(`/equipment/${id}`, {
      method: 'DELETE'
    });
  }

  async getEquipmentCategories() {
    return this.request('/equipment/categories/list');
  }

  // Project methods
  async getProjects(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/projects${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getProjectById(id) {
    return this.request(`/projects/${id}`);
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  async saveProject(projectData) {
    return this.request('/projects/save', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  async updateProject(id, projectData) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    });
  }

  async getProjectStats() {
    return this.request('/projects/stats/summary');
  }

  // Utility methods
  isAuthenticated() {
    return !!this.getToken();
  }

  async checkConnection() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;