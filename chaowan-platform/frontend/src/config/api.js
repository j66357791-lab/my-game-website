// frontend/src/config/api.js - 确保正确
const API_BASE_URL = 'https://tianchang.zeabur.app/api';

// API对象
const apiObject = {
  // 通用请求函数 - 自动处理token
  request: async function(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    console.log(`🌐 API请求: ${endpoint}`);
    console.log('Token状态:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // 自动添加Authorization头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API错误响应: ${response.status} ${response.statusText}`);
        console.error('错误内容:', errorText);
        
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
      
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('网络连接失败，请检查网络或联系管理员');
      }
      
      throw error;
    }
  },

  // 登录 - 不需要token
  login: async function(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // 获取用户信息 - 自动处理token
  getUser: async function() {
    return this.request('/auth/user');
  },

  // 基础HTTP方法 - 自动处理token
  get: async function(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  },

  post: async function(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  },

  put: async function(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  },

  delete: async function(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  },

  // 🔥 新增：存储token到localStorage
  setToken: function(token) {
    localStorage.setItem('token', token);
  }
};

// 导出
export default apiObject;
export { apiObject as api };

// 全局注册
if (typeof window !== 'undefined') {
  window.api = apiObject;
}

console.log('✅ API模块已加载');
