// src/config/api.js
import { APP_CONSTANTS } from '../utils/constants';

// 🔧 固定使用正确的API地址
const API_BASE_URL = 'https://tianchuang.onrender.com/api';

console.log('🔧 使用API地址:', API_BASE_URL);

// 请求锁机制，防止重复请求
const requestLocks = new Map();

// 🔧 获取当前用户token的辅助函数
const getCurrentToken = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.warn('⚠️ 未找到用户信息，请先登录');
      return null;
    }
    const user = JSON.parse(userStr);
    if (!user.token) {
      console.warn('⚠️ 用户token不存在，请重新登录');
      return null;
    }
    console.log('✅ 获取到用户token:', user.token.substring(0, 20) + '...');
    return user.token;
  } catch (error) {
    console.error('❌ 获取用户token失败:', error);
    return null;
  }
};

// 带超时和防重复的fetch请求
const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
  const requestKey = `${options.method || 'GET'}:${url}`;
  
  if (requestLocks.has(requestKey)) {
    console.log('⏸️ 请求已在进行中，等待结果:', requestKey);
    return requestLocks.get(requestKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestPromise = (async () => {
    try {
      console.log('🌐 发起请求:', url, options);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      console.log('📡 收到响应:', response.status, response.statusText);

      // 专门处理401和403错误
      if (response.status === 401) {
        console.error('🔒 认证失败，请重新登录');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('认证失败，请重新登录');
      }

      if (response.status === 403) {
        console.error('🚫 权限不足，需要管理员权限');
        throw new Error('权限不足，需要管理员权限');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 请求成功:', data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('⏰ 请求超时:', url);
        throw new Error('请求超时，请检查网络连接');
      }
      
      console.error('❌ 请求失败:', error);
      throw error;
    } finally {
      requestLocks.delete(requestKey);
    }
  })();

  requestLocks.set(requestKey, requestPromise);
  return requestPromise;
};

// 🔧 带认证的fetch请求
const fetchWithAuth = async (url, options = {}) => {
  const token = getCurrentToken();
  if (!token) {
    throw new Error('用户未登录或token已失效');
  }

  return fetchWithTimeout(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
};

export const api = {
  // 登录
  login: async (email, password) => {
    console.log('🔐 开始登录API调用');
    try {
      const result = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (result.success && result.data?.user?.role === 'admin') {
        console.log('👑 管理员登录成功');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 登录失败:', error);
      throw error;
    }
  },

  // 注册
  register: async (username, email, password) => {
    console.log('🆕 开始注册API调用');
    return fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },

  // 获取用户信息
  getUser: async () => {
    console.log('👤 开始获取用户信息');
    return fetchWithAuth(`${API_BASE_URL}/auth/user`);
  },

  // 签到状态
  getCheckinStatus: async () => {
    console.log('📅 开始获取签到状态');
    return fetchWithAuth(`${API_BASE_URL}/checkin/status`);
  },

  // 签到
  checkin: async () => {
    console.log('✅ 开始签到');
    return fetchWithAuth(`${API_BASE_URL}/checkin`, {
      method: 'POST'
    });
  },

  // 积分历史
  getPointsHistory: async () => {
    console.log('💰 开始获取积分历史');
    return fetchWithAuth(`${API_BASE_URL}/points/history`);
  },

  // ==================== 管理员API ====================

  // 📊 获取管理员仪表板数据
  getAdminDashboard: async () => {
    console.log('📊 获取管理员仪表板数据');
    try {
      const result = await fetchWithAuth(`${API_BASE_URL}/admin/dashboard`);
      console.log('📊 仪表板数据获取成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取仪表板数据失败:', error);
      throw error;
    }
  },

  // 👥 用户管理
  getAdminUsers: async (page = 1, limit = 20, search = '', sortBy = 'createdAt') => {
    console.log('👥 获取用户列表');
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search, sortBy });
    return fetchWithAuth(`${API_BASE_URL}/admin/users?${params}`);
  },

  updateAdminUser: async (userId, userData) => {
    console.log('✏️ 更新用户信息:', userId, userData);
    return fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  deleteAdminUser: async (userId) => {
    console.log('🗑️ 删除用户:', userId);
    return fetchWithAuth(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // 💰 积分管理
  getAdminPoints: async (page = 1, limit = 20, userId = '', type = '') => {
    console.log('💰 获取积分记录');
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString(), 
      userId, 
      type 
    });
    return fetchWithAuth(`${API_BASE_URL}/admin/points?${params}`);
  },

  adjustUserPoints: async (userId, amount, description) => {
    console.log('💰 调整用户积分:', userId, amount);
    return fetchWithAuth(`${API_BASE_URL}/admin/points/adjust`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description })
    });
  },

  // 💳 交易管理
  getAdminTransactions: async (page = 1, limit = 20, userId = '', type = '', startDate = '', endDate = '') => {
    console.log('💳 获取交易记录');
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString() 
    });
    
    if (userId) params.append('userId', userId);
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return fetchWithAuth(`${API_BASE_URL}/admin/transactions?${params}`);
  },

  // 📊 数据分析
  getAdminAnalytics: async (period = '7d') => {
    console.log('📊 获取分析数据, 周期:', period);
    return fetchWithAuth(`${API_BASE_URL}/admin/analytics?period=${period}`);
  },

  // 🔧 修复管理员权限
  fixAdminPermissions: async (email) => {
    console.log('🔧 修复管理员权限:', email);
    return fetchWithTimeout(`${API_BASE_URL}/fix-admin`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // 测试连接
  testConnection: async () => {
    console.log('🔍 测试API连接');
    
    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      console.log('🔧 测试的基础URL:', baseUrl);
      
      const response = await fetch(baseUrl);
      const data = await response.json();
      console.log('✅ 连接测试成功:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ 连接测试失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 🔧 检查当前用户状态
  checkUserStatus: async () => {
    console.log('🔍 检查当前用户状态');
    const token = getCurrentToken();
    if (!token) {
      return { success: false, message: '用户未登录' };
    }

    try {
      const user = await api.getUser();
      console.log('👤 当前用户状态:', user);
      return { success: true, user: user.data };
    } catch (error) {
      console.error('❌ 检查用户状态失败:', error);
      return { success: false, error: error.message };
    }
  }
};

export default api;
