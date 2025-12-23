// frontend/src/utils/dataSync.js - 完整修复版本
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
    const currentQueue = [...updateQueue];
    updateQueue = [];
    
    if (currentQueue.length === 0) return;
    
    const mergedUpdate = currentQueue.reduce((acc, update) => {
      return { ...acc, ...update };
    }, {});
    
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
    if (mergedUpdate.points !== undefined) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.POINTS, mergedUpdate.points);
    }
    if (mergedUpdate.starcoin !== undefined) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.STARCOIN, mergedUpdate.starcoin);
    }
    if (mergedUpdate.cashBalance !== undefined) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH, mergedUpdate.cashBalance);
    }
    if (mergedUpdate.dolls) {
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, mergedUpdate.dolls);
    }
    
    window.dispatchEvent(new CustomEvent('userDataUpdated', {
      detail: mergedUpdate
    }));
    
    if (updateQueue.length > 0) {
      setTimeout(processUpdateQueue, 10);
    }
  } finally {
    isProcessingQueue = false;
  }
};

const debouncedProcessQueue = debounce(processUpdateQueue, 100);

export const dataSync = {
  // 修复：同步用户数据到UserContext
  syncUserData: (userData, userContext) => {
    console.log('同步用户数据到UserContext:', userData);
    
    // 使用UserContext的批量更新方法
    if (userContext && userContext.updateAllData) {
      userContext.updateAllData(userData);
    }
    
    // 同时更新localStorage
    const updateData = {
      user: userData.user,
      points: userData.points,
      starcoin: userData.starcoin,
      cashBalance: userData.cashBalance,
      dolls: userData.dolls
    };
    
    if (updateData.user) updateQueue.push({ user: updateData.user });
    if (updateData.points !== undefined) updateQueue.push({ points: updateData.points });
    if (updateData.starcoin !== undefined) updateQueue.push({ starcoin: updateData.starcoin });
    if (updateData.cashBalance !== undefined) updateQueue.push({ cashBalance: updateData.cashBalance });
    if (updateData.dolls) updateQueue.push({ dolls: updateData.dolls });
    
    debouncedProcessQueue();
  },

  syncAfterPurchase: async (result, userContext) => {
    if (userContext && userContext.updateAllData) {
      await userContext.updateAllData({
        points: result.newPoints,
        dolls: result.newDolls
      });
    }
    return result;
  }
};
