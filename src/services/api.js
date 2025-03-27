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
  
  try {
    // 如果已经是YYYY-MM-DD格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // 创建日期对象
    const date = new Date(dateStr);
    
    // 获取本地日期部分，避免时区转换问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 返回固定格式的日期字符串 YYYY-MM-DD
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return null;
  }
};

// 创建保留时间部分的ISO格式日期字符串，用于发送完整的日期时间
const createLocalDateObject = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // 创建日期对象
    const date = new Date(dateStr);
    
    // 创建一个不受时区影响的新日期对象
    // 明确使用本地年月日时分秒创建日期对象
    const localDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0 // 固定时间为中午12:00:00，避免跨日问题
    );
    
    return localDate;
  } catch (error) {
    console.error('创建本地日期对象错误:', error);
    return null;
  }
};

// Task related APIs
export const tasksAPI = {
  // Get all tasks
  getAllTasks: async () => {
    try {
      const response = await api.get('/api/tasks');
      
      // 如果有任务数据，将后端的 start_time 字段映射为前端的 startTime
      if (response.data && response.data.tasks && Array.isArray(response.data.tasks)) {
        response.data.tasks = response.data.tasks.map(task => ({
          ...task,
          startTime: task.start_time,  // 添加 startTime 字段
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
      
      // 将后端的 start_time 字段映射为前端的 startTime
      const responseData = {
        ...response.data,
        startTime: response.data.start_time,
      };
      
      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create new task
  createTask: async (taskData) => {
    try {
      // 字段名称映射 - 将前端的 startTime 转换为后端需要的 start_time
      const normalizedTask = {
        ...taskData,
        deadline: normalizeDateString(taskData.deadline),
        // 使用本地日期对象处理开始时间
        start_time: taskData.startTime ? createLocalDateObject(taskData.startTime) : null,
        createdAt: normalizeDateString(taskData.createdAt) || normalizeDateString(new Date()),
        // 删除原始的 startTime 字段以避免冗余和混淆
        startTime: undefined
      };
      
      console.log('发送到后端的任务数据:', normalizedTask);
      const response = await api.post('/api/tasks', normalizedTask);
      
      // 在返回的数据中将 start_time 映射回 startTime，保持前端一致性
      const responseData = {
        ...response.data,
        startTime: response.data.start_time,
      };
      
      return responseData;
    } catch (error) {
      console.error('Create task error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update task
  updateTask: async (taskId, taskData) => {
    try {
      // 字段名称映射 - 将前端的 startTime 转换为后端需要的 start_time
      const normalizedTask = {
        ...taskData,
        deadline: normalizeDateString(taskData.deadline),
        // 使用本地日期对象处理开始时间
        start_time: taskData.startTime ? createLocalDateObject(taskData.startTime) : null,
        // 删除原始的 startTime 字段以避免冗余和混淆
        startTime: undefined
      };
      
      console.log('Sending update to API:', normalizedTask);
      const response = await api.put(`/api/tasks/${taskId}`, normalizedTask);
      console.log('API update response:', response.data);
      
      // 在返回的数据中将 start_time 映射回 startTime，保持前端一致性
      const responseData = {
        ...response.data,
        startTime: response.data.start_time,
      };
      
      return responseData;
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