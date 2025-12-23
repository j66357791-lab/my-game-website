// frontend/src/config/api.js - 完整修复版
import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'https://tianchuang.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 自动添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储
      localStorage.removeItem('token');
      // 可以在这里跳转到登录页
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 设置token的方法
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// 获取token
const getToken = () => {
  return localStorage.getItem('token');
};

// 登录
const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// 注册
const register = async (username, email, password) => {
  try {
    const response = await apiClient.post('/auth/register', { username, email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// 获取用户信息
const getUser = async () => {
  try {
    const response = await apiClient.get('/auth/user');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// GET请求
const get = async (url, config) => {
  try {
    const response = await apiClient.get(url, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// POST请求
const post = async (url, data, config) => {
  try {
    const response = await apiClient.post(url, data, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// PUT请求
const put = async (url, data, config) => {
  try {
    const response = await apiClient.put(url, data, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// DELETE请求
const del = async (url, config) => {
  try {
    const response = await apiClient.delete(url, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// 导出完整的API对象
const api = {
  client: apiClient,
  setToken,
  getToken,
  login,
  register,
  getUser,
  get,
  post,
  put,
  delete: del
};

export default api;
