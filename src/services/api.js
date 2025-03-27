import axios from 'axios';

// Create API base configuration
const API_BASE_URL = 'https://todo-backend-mocha-iota.vercel.app'; // 更新为新的后端API地址

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

// 确保日期字符串格式正确 (YYYY-MM-DD)，不受时区影响
const normalizeDateString = (dateStr) => {
  if (!dateStr) return null;
  // 如果已经是YYYY-MM-DD格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // 处理可能带有时间部分的日期字符串
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Task related APIs
export const tasksAPI = {
  // Get all tasks
  getAllTasks: async () => {
    try {
      const response = await api.get('/api/tasks');
      
      // 将后端返回的 start_time 字段映射为前端的 startTime
      if (response.data && response.data.tasks && Array.isArray(response.data.tasks)) {
        response.data.tasks = response.data.tasks.map(task => ({
          ...task,
          startTime: task.start_time, // 映射字段
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('Get tasks error:', error.response?.data || error.message || 'Unknown error');
      // 如果没有响应，可能是网络问题
      if (!error.response) {
        throw new Error('Network Error: Unable to connect to the server');
      }
      throw error;
    }
  },
  
  // Get single task
  getTask: async (id) => {
    try {
      const response = await api.get(`/api/tasks/${id}`);
      
      // 映射 start_time 到 startTime
      const taskWithStartTime = {
        ...response.data,
        startTime: response.data.start_time
      };
      
      return taskWithStartTime;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create new task
  createTask: async (taskData) => {
    try {
      // 确保日期格式正确并将startTime映射为start_time
      const normalizedTask = {
        ...taskData,
        deadline: taskData.deadline,
        start_time: taskData.startTime, // 映射字段
        // 不要包含startTime字段，避免冗余
        startTime: undefined,
        createdAt: taskData.createdAt || new Date().toISOString().split('T')[0]
      };
      
      console.log('Creating task with data:', normalizedTask);
      const response = await api.post('/api/tasks', normalizedTask);
      
      // 映射返回的数据，将start_time变为startTime
      const responseWithStartTime = {
        ...response.data,
        startTime: response.data.start_time
      };
      
      return responseWithStartTime;
    } catch (error) {
      console.error('Create task error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update task
  updateTask: async (taskId, taskData) => {
    try {
      // 确保日期格式正确并将startTime映射为start_time
      const normalizedTask = {
        ...taskData,
        deadline: taskData.deadline,
        start_time: taskData.startTime, // 映射字段
        // 不要包含startTime字段，避免冗余
        startTime: undefined
      };
      
      console.log('Updating task with data:', normalizedTask);
      const response = await api.put(`/api/tasks/${taskId}`, normalizedTask);
      
      // 映射返回的数据，将start_time变为startTime
      const responseWithStartTime = {
        ...response.data,
        startTime: response.data.start_time
      };
      
      return responseWithStartTime;
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

// 添加错误信息转换函数
const getReadableErrorMessage = (error) => {
  if (!error.response) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  const status = error.response.status;
  
  switch (status) {
    case 400:
      return 'The information you provided is invalid. Please check and try again.';
    case 401:
      return 'You need to log in again to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested information could not be found.';
    case 409:
      return 'This information conflicts with existing data.';
    case 500:
      return 'Something went wrong on our server. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export default api; 