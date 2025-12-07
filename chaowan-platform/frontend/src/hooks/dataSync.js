// src/utils/dataSync.js
import { storage } from './storage';

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
  
  // 合并所有更新
  const mergedUpdate = updateQueue.reduce((acc, update) => {
    return { ...acc, ...update };
  }, {});
  
  // 执行批量更新
  if (mergedUpdate.user) storage.user.setUser(mergedUpdate.user);
  if (mergedUpdate.points !== undefined) storage.user.setPoints(mergedUpdate.points);
  if (mergedUpdate.cashBalance !== undefined) storage.user.setCash(mergedUpdate.cashBalance);
  if (mergedUpdate.dolls) storage.user.setDolls(mergedUpdate.dolls);
  
  // 触发一次全局事件
  window.dispatchEvent(new CustomEvent('userDataUpdated', {
    detail: mergedUpdate
  }));
  
  // 清空队列
  updateQueue = [];
  isProcessingQueue = false;
};

// 防抖的批量处理
const debouncedProcessQueue = debounce(processUpdateQueue, 100);

export const dataSync = {
  // 同步用户数据到本地存储（防抖版）
  syncUserData: debounce((userData) => {
    const { user, points, cashBalance, dolls } = userData;
    
    // 添加到更新队列
    if (user) updateQueue.push({ user });
    if (points !== undefined) updateQueue.push({ points });
    if (cashBalance !== undefined) updateQueue.push({ cashBalance });
    if (dolls) updateQueue.push({ dolls });
    
    // 防抖处理
    debouncedProcessQueue();
  }, 300),

  // 购买娃娃后的数据同步
  syncAfterPurchase: (purchaseResult) => {
    const { newPoints, newDoll, updatedUser } = purchaseResult;
    
    const updates = {};
    if (newPoints !== undefined) {
      updates.points = newPoints;
    }
    
    if (newDoll) {
      const currentDolls = storage.user.getDolls();
      updates.dolls = [...currentDolls, newDoll];
    }
    
    if (updatedUser) {
      updates.user = updatedUser;
    }
    
    // 立即同步购买操作（不防抖）
    if (updates.user) storage.user.setUser(updates.user);
    if (updates.points !== undefined) storage.user.setPoints(updates.points);
    if (updates.dolls) storage.user.setDolls(updates.dolls);
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('dollPurchased', {
      detail: { newPoints, newDoll }
    }));
  },

  // 回收娃娃后的数据同步
  syncAfterRecycle: (recycleResult) => {
    const { recyclePoints, dollId, updatedUser } = recycleResult;
    
    const updates = {};
    if (recyclePoints !== undefined) {
      const currentPoints = storage.user.getPoints();
      updates.points = currentPoints + recyclePoints;
    }
    
    if (dollId) {
      const currentDolls = storage.user.getDolls();
      updates.dolls = currentDolls.filter(doll => doll.id !== dollId);
    }
    
    if (updatedUser) {
      updates.user = updatedUser;
    }
    
    // 立即同步回收操作（不防抖）
    if (updates.user) storage.user.setUser(updates.user);
    if (updates.points !== undefined) storage.user.setPoints(updates.points);
    if (updates.dolls) storage.user.setDolls(updates.dolls);
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('dollRecycled', {
      detail: { recyclePoints, dollId }
    }));
  },

  // 获取完整用户数据
  getUserData: () => {
    return {
      user: storage.user.getUser(),
      points: storage.user.getPoints(),
      cashBalance: storage.user.getCash(),
      dolls: storage.user.getDolls()
    };
  },

  // 清理用户数据
  clearUserData: () => {
    storage.user.removeToken();
    storage.user.removeUser();
    storage.user.removePoints();
    storage.user.removeCash();
    storage.user.removeDolls();
    
    // 触发全局事件
    window.dispatchEvent(new CustomEvent('userDataCleared'));
  }
};
