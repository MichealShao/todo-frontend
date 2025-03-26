import axios from 'axios';

// Create API base configuration
const API_BASE_URL = 'https://todo-backend-one-jet.vercel.app'; // Modify according to actual backend address

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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication related APIs
export const authAPI = {
  // User registration
  register: async (userData) => {
    try {
      const response = await api.post('/api/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // User login
  login: async (credentials) => {
    try {
      const response = await api.post('/api/login', credentials);
      // Store token if returned
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('token');
  }
};

// Task related APIs
export const tasksAPI = {
  // Get all tasks
  getAllTasks: async () => {
    try {
      const response = await api.get('/api/tasks');
      return response.data;
    } catch (error) {
      console.error('Get tasks error:', error.response?.data || error.message);
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
      console.error('Create task error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update task
  updateTask: async (taskId, taskData) => {
    try {
      const response = await api.put(`/api/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error('Update task error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete task
  deleteTask: async (taskId) => {
    try {
      const response = await api.delete(`/api/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Delete task error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default api; 