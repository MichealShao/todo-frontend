import axios from 'axios';

// Create API base configuration
const API_BASE_URL = 'http://localhost:5001'; // Modify according to actual backend address

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add authentication token to each request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set token according to backend's required format
      config.headers['Authorization'] = `Bearer ${token}`;
      // Keep x-auth-token for compatibility with possible old configurations
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token invalid or expired, redirect to login page
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication related APIs
export const authAPI = {
  // User registration
  register: async (userData) => {
    const response = await api.post('/api/register', userData);
    return response.data;
  },
  
  // User login
  login: async (credentials) => {
    const response = await api.post('/api/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('token');
  }
};

// Task related APIs
export const tasksAPI = {
  // Get all tasks
  getAllTasks: async (page = 1, limit = 20, sortField = 'createdAt', sortDirection = 'desc') => {
    try {
      const response = await api.get('/api/tasks', {
        params: { page, limit, sortField, sortDirection },
      });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Get single task
  getTask: async (id) => {
    try {
      const response = await api.get(`/api/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create new task
  createTask: async (taskData) => {
    try {
      const response = await api.post('/api/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Update task
  updateTask: async (id, taskData) => {
    try {
      console.log('Sending update with status:', taskData.status);
      console.log('Updating task ID:', id);
      if (taskData.hours && typeof taskData.hours === 'string') {
        taskData.hours = parseInt(taskData.hours, 10);
      }
      
      const requestData = {
        ...taskData,
        id
      };
      
      console.log('Complete request data:', requestData);
      
      const response = await api.put(`/api/tasks/${id}`, requestData);
      
      const result = response.data;
      if (!result.id && id) {
        result.id = id;
      }
      
      console.log('API update response result:', result);
      return result;
    } catch (error) {
      console.error('Update task API error:', error.response?.data || error.message || error);
      throw error;
    }
  },
  
  // Delete task
  deleteTask: async (id) => {
    try {
      // Ensure ID exists and has correct format
      if (!id) {
        throw new Error('Task ID is required for deletion');
      }
      
      // Output debug information
      console.log('Deleting task, ID:', id);
      
      const response = await api.delete(`/api/tasks/${id}`);
      
      console.log('Delete task API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete task API error:', error.response?.data || error.message || error);
      
      // If 404 error, task may not exist, still return success for UI update
      if (error.response && error.response.status === 404) {
        console.log('Task does not exist or already deleted');
        return { success: true, message: 'Task not found or already deleted' };
      }
      
      throw error;
    }
  }
};

export default api; 