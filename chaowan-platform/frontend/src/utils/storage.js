// src/utils/storage.js

export const storage = {
  // 设置本地存储
  setItem: (key, value) => {
    try {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('存储失败:', error);
    }
  },

  // 获取本地存储
  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('读取失败:', error);
      return defaultValue;
    }
  },

  // 删除本地存储
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('删除失败:', error);
    }
  },

  // 清空所有存储
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('清空失败:', error);
    }
  },

  // 用户相关存储
  user: {
    setToken: (token) => storage.setItem('token', token),
    getToken: () => storage.getItem('token'),
    removeToken: () => storage.removeItem('token'),
    
    setUser: (user) => storage.setItem('user', user),
    getUser: () => storage.getItem('user'),
    removeUser: () => storage.removeItem('user'),
    
    setPoints: (points) => storage.setItem('userPoints', points),
    getPoints: () => storage.getItem('userPoints', 0),
    removePoints: () => storage.removeItem('userPoints'),
    
    setCash: (cash) => storage.setItem('userCashBalance', cash),
    getCash: () => storage.getItem('userCashBalance', 0),
    removeCash: () => storage.removeItem('userCashBalance'),
    
    setDolls: (dolls) => storage.setItem('userDolls', dolls),
    getDolls: () => storage.getItem('userDolls', []),
    removeDolls: () => storage.removeItem('userDolls')
  }
};
