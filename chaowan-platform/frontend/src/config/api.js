// frontend/src/config/api.js - 修复导出问题
const API_BASE_URL = 'https://tianchuang.onrender.com/api';

// 🔧 修复：使用默认导出
const api = {
  // 通用请求函数 - 添加CORS支持
  request: async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    console.log(`🌐 API请求: ${endpoint}`);
    console.log('Token状态:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      // 添加CORS相关配置
      mode: 'cors',
      credentials: 'include',
      ...options
    };

    // 只有token存在时才添加Authorization头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // 详细的错误处理
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API错误响应: ${response.status} ${response.statusText}`);
        console.error('错误内容:', errorText);
        
        // 尝试解析JSON错误
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP ${response.status}`);
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API请求失败: ${endpoint}`, error);
      
      // 特殊处理CORS错误
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('网络连接失败，请检查网络或联系管理员');
      }
      
      throw error;
    }
  },

  // 登录专用方法（不需要token）
  login: async (email, password) => {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // 获取用户信息
  getUser: async (token) => {
    if (!token) {
      throw new Error('未提供token');
    }
    
    return this.request('/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // 其他API方法
  get: (endpoint, options = {}) => {
    return this.request(endpoint, { method: 'GET', ...options });
  },

  post: (endpoint, data, options = {}) => {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  },

  put: (endpoint, data, options = {}) => {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  },

  delete: (endpoint, options = {}) => {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
};

// 🔧 修复：使用默认导出
export default api;

// 🔧 同时提供命名导出（兼容性）
export { api };
