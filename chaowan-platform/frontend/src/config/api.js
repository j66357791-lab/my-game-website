// src/config/api.js
import { APP_CONSTANTS } from '../utils/constants';

// 🔧 固定使用正确的API地址
const API_BASE_URL = 'https://tianchuang.onrender.com/api';

console.log('🔧 使用API地址:', API_BASE_URL);

// 请求锁机制，防止重复请求
const requestLocks = new Map();

// 带超时和防重复的fetch请求
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
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

export const api = {
  // 登录
  login: async (email, password) => {
    console.log('🔐 开始登录API调用');
    return fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
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
  getUser: async (token) => {
    console.log('👤 开始获取用户信息');
    return fetchWithTimeout(`${API_BASE_URL}/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 签到状态
  getCheckinStatus: async (token) => {
    console.log('📅 开始获取签到状态');
    return fetchWithTimeout(`${API_BASE_URL}/checkin/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 签到
  checkin: async (token) => {
    console.log('✅ 开始签到');
    return fetchWithTimeout(`${API_BASE_URL}/checkin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 积分历史
  getPointsHistory: async (token) => {
    console.log('💰 开始获取积分历史');
    return fetchWithTimeout(`${API_BASE_URL}/points/history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 获取用户完整数据
  getUserProfile: async (token) => {
    console.log('👤 开始获取用户完整数据');
    return fetchWithTimeout(`${API_BASE_URL}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 获取我的娃娃
  getMyDolls: async (token) => {
    console.log('🧸 开始获取我的娃娃');
    return fetchWithTimeout(`${API_BASE_URL}/dolls/my-dolls`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 购买娃娃
  purchaseDoll: async (dollId, token) => {
    console.log('🛒 开始购买娃娃');
    return fetchWithTimeout(`${API_BASE_URL}/dolls/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ dollId })
    });
  },

  // 回收娃娃
  recycleDoll: async (dollId, token) => {
    console.log('♻️ 开始回收娃娃');
    return fetchWithTimeout(`${API_BASE_URL}/dolls/recycle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ dollId })
    });
  },

  // ==================== 管理员API ====================

  // 📊 获取管理员仪表板数据
  getAdminDashboard: async (token) => {
    console.log('📊 获取管理员仪表板数据');
    return fetchWithTimeout(`${API_BASE_URL}/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // 👥 用户管理
  getAdminUsers: async (token, page = 1, limit = 20, search = '', sortBy = 'createdAt') => {
    console.log('👥 获取用户列表');
    return fetchWithTimeout(`${API_BASE_URL}/admin/users?page=${page}&limit=${limit}&search=${search}&sortBy=${sortBy}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  updateAdminUser: async (userId, userData, token) => {
    console.log('✏️ 更新用户信息');
    return fetchWithTimeout(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
  },

  deleteAdminUser: async (userId, token) => {
    console.log('🗑️ 删除用户');
    return fetchWithTimeout(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // 💰 积分管理
  getAdminPoints: async (token, page = 1, limit = 20, userId = '', type = '') => {
    console.log('💰 获取积分记录');
    return fetchWithTimeout(`${API_BASE_URL}/admin/points?page=${page}&limit=${limit}&userId=${userId}&type=${type}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  adjustUserPoints: async (userId, amount, description, token) => {
    console.log('💰 调整用户积分');
    return fetchWithTimeout(`${API_BASE_URL}/admin/points/adjust`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, amount, description })
    });
  },

  // 💳 交易管理
  getAdminTransactions: async (token, page = 1, limit = 20, userId = '', type = '', startDate = '', endDate = '') => {
    console.log('💳 获取交易记录');
    let url = `${API_BASE_URL}/admin/transactions?page=${page}&limit=${limit}`;
    if (userId) url += `&userId=${userId}`;
    if (type) url += `&type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    return fetchWithTimeout(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // 📊 数据分析
  getAdminAnalytics: async (token, period = '7d') => {
    console.log('📊 获取分析数据');
    return fetchWithTimeout(`${API_BASE_URL}/admin/analytics?period=${period}`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
  }
};
