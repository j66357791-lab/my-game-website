// src/utils/dataSync.js
import { APP_CONSTANTS } from './constants';

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 批量更新队列
let updateQueue = [];
let isProcessingQueue = false;

const processUpdateQueue = () => {
  if (isProcessingQueue || updateQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    // 获取当前队列的快照
    const currentQueue = [...updateQueue];
    updateQueue = [];
    
    if (currentQueue.length === 0) return;
    
    // 合并所有更新
    const mergedUpdate = currentQueue.reduce((acc, update) => {
      return { ...acc, ...update };
    }, {});
    
    // 安全的localStorage操作
    const safeLocalStorage = {
      set: (key, value) => {
        try {
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.error('localStorage写入失败:', error);
        }
      }
    };
    
    // 执行批量更新
    if (mergedUpdate.user) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, mergedUpdate.user);
    }
    if (mergedUpdate.integral !== undefined) { // 使用 integral 替代 points
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL, mergedUpdate.integral); // 假设 constants.js 中有 INTEGRAL 键
    }
    if (mergedUpdate.cashBalance !== undefined) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH, mergedUpdate.cashBalance);
    }
    if (mergedUpdate.dolls) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, mergedUpdate.dolls);
    }
    
    // 触发一次全局事件
    window.dispatchEvent(new CustomEvent('userDataUpdated', {
      detail: mergedUpdate
    }));
    
    // 检查是否有新更新加入
    if (updateQueue.length > 0) {
      setTimeout(processUpdateQueue, 10);
    }
  } finally {
    isProcessingQueue = false;
  }
};

// 防抖的批量处理
const debouncedProcessQueue = debounce(processUpdateQueue, 100);

export const dataSync = {
  // 同步用户数据到本地存储（防抖版）
  syncUserData: (userData) => {
    const { user, integral, cashBalance, dolls } = userData; // 使用 integral
    
    // 添加到更新队列
    if (user) updateQueue.push({ user });
    if (integral !== undefined) updateQueue.push({ integral }); // 使用 integral
    if (cashBalance !== undefined) updateQueue.push({ cashBalance });
    if (dolls) updateQueue.push({ dolls });
    
    // 防抖处理
    debouncedProcessQueue();
  },

  // 购买娃娃后的数据同步
  syncAfterPurchase: (purchaseResult) => {
    const { newIntegral, newDoll, updatedUser } = purchaseResult; // 使用 integral
    
    // 立即同步购买操作（不防抖）
    const safeLocalStorage = {
      set: (key, value) => {
        try {
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.error('localStorage写入失败:', error);
        }
      },
      
      get: (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          if (item === null) return defaultValue;
          return JSON.parse(item);
        } catch (error) {
          console.error('localStorage读取失败:', error);
          return defaultValue;
        }
      }
    };
    
    if (newIntegral !== undefined) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL, newIntegral); // 使用 integral
    }
    
    if (newDoll) {
      const currentDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, []);
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, [...currentDolls, newDoll]);
    }
    
    if (updatedUser) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, updatedUser);
    }
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('dollPurchased', {
      detail: { newIntegral, newDoll } // 使用 integral
    }));
  },

  // 回收娃娃后的数据同步
  syncAfterRecycle: (recycleResult) => {
    const { recycleIntegral, dollId, updatedUser } = recycleResult; // 使用 integral
    
    // 立即同步回收操作（不防抖）
    const safeLocalStorage = {
      set: (key, value) => {
        try {
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.error('localStorage写入失败:', error);
        }
      },
      
      get: (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          if (item === null) return defaultValue;
          return JSON.parse(item);
        } catch (error) {
          console.error('localStorage读取失败:', error);
          return defaultValue;
        }
      }
    };
    
    if (recycleIntegral !== undefined) {
      const currentIntegral = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL, 0); // 使用 integral
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL, currentIntegral + recycleIntegral);
    }
    
    if (dollId) {
      const currentDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, []);
      const newDolls = currentDolls.filter(doll => doll.id !== dollId);
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, newDolls);
    }
    
    if (updatedUser) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, updatedUser);
    }
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('dollRecycled', {
      detail: { recycleIntegral, dollId } // 使用 integral
    }));
  },

  // 获取完整用户数据
  getUserData: () => {
    const safeLocalStorage = {
      get: (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          if (item === null) return defaultValue;
          return JSON.parse(item);
        } catch (error) {
          console.error('localStorage读取失败:', error);
          return defaultValue;
        }
      }
    };
    
    return {
      user: safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.USER),
      integral: safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL, 0), // 使用 integral
      cashBalance: safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.CASH, 0),
      dolls: safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, [])
    };
  },

  // 清理用户数据
  clearUserData: () => {
    const safeLocalStorage = {
      remove: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('localStorage删除失败:', error);
        }
      }
    };
    
    safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.TOKEN);
    safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.USER);
    safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.INTEGRAL); // 使用 integral
    safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.CASH);
    safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.DOLLS);
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('userDataCleared'));
  }
};
