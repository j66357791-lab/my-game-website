// src/contexts/UserContext.js
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { APP_CONSTANTS } from '../utils/constants';

// 🎯 添加DOLL_CONSTANTS定义
const DOLL_CONSTANTS = {
  RECYCLE_RATE: 0.5, // 回收比例：50%的剩余天数价值
  DEFAULT_DAYS: 60,  // 默认天数
  MIN_RECYCLE_POINTS: 10 // 最小回收积分
};

// 🔧 V7.4.2 修复版 - 解决循环更新问题
const initialState = {
  // 用户基本信息
  user: null,
  
  // 积分和现金
  points: 0,
  cashBalance: 0,
  
  // 娃娃数据
  dolls: [],
  
  // 状态管理
  loading: false,
  error: null,
  
  // 数据刷新状态
  refreshing: false,
  
  // 版本控制
  dataVersion: 0
};

// Action类型定义
const actionTypes = {
  // 用户相关
  SET_USER: 'SET_USER',
  UPDATE_USER: 'UPDATE_USER',
  
  // 积分和现金
  SET_POINTS: 'SET_POINTS',
  UPDATE_POINTS: 'UPDATE_POINTS',
  SET_CASH: 'SET_CASH',
  UPDATE_CASH: 'UPDATE_CASH',
  
  // 娃娃相关
  SET_DOLLS: 'SET_DOLLS',
  ADD_DOLL: 'ADD_DOLL',
  REMOVE_DOLL: 'REMOVE_DOLL',
  UPDATE_DOLL: 'UPDATE_DOLL',
  
  // 状态管理
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_REFRESHING: 'SET_REFRESHING',
  
  // 批量更新
  REFRESH_DATA: 'REFRESH_DATA',
  RESET_STATE: 'RESET_STATE',
  
  // 版本控制
  INCREMENT_VERSION: 'INCREMENT_VERSION'
};

// Reducer函数
const userReducer = (state, action) => {
  switch (action.type) {
    // 用户相关
    case actionTypes.SET_USER:
      return { ...state, user: action.payload, dataVersion: state.dataVersion + 1 };
    case actionTypes.UPDATE_USER:
      return { 
        ...state, 
        user: { ...state.user, ...action.payload },
        dataVersion: state.dataVersion + 1
      };
    
    // 积分相关
    case actionTypes.SET_POINTS:
      return { ...state, points: action.payload, dataVersion: state.dataVersion + 1 };
    case actionTypes.UPDATE_POINTS:
      return { 
        ...state, 
        points: Math.max(0, state.points + action.payload),
        dataVersion: state.dataVersion + 1
      };
    
    // 现金相关
    case actionTypes.SET_CASH:
      return { ...state, cashBalance: action.payload, dataVersion: state.dataVersion + 1 };
    case actionTypes.UPDATE_CASH:
      return { 
        ...state, 
        cashBalance: Math.max(0, state.cashBalance + action.payload),
        dataVersion: state.dataVersion + 1
      };
    
    // 娃娃相关
    case actionTypes.SET_DOLLS:
      return { ...state, dolls: action.payload, dataVersion: state.dataVersion + 1 };
    case actionTypes.ADD_DOLL:
      return { 
        ...state, 
        dolls: [...state.dolls, action.payload],
        dataVersion: state.dataVersion + 1
      };
    case actionTypes.REMOVE_DOLL:
      return { 
        ...state, 
        dolls: state.dolls.filter(doll => doll.id !== action.payload),
        dataVersion: state.dataVersion + 1
      };
    case actionTypes.UPDATE_DOLL:
      return {
        ...state,
        dolls: state.dolls.map(doll => 
          doll.id === action.payload.id 
            ? { ...doll, ...action.payload.updates }
            : doll
        ),
        dataVersion: state.dataVersion + 1
      };
    
    // 状态管理
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.SET_REFRESHING:
      return { ...state, refreshing: action.payload };
    
    // 批量更新
    case actionTypes.REFRESH_DATA:
      return { 
        ...state, 
        ...action.payload,
        dataVersion: state.dataVersion + 1
      };
    case actionTypes.RESET_STATE:
      return { ...initialState };
    
    // 版本控制
    case actionTypes.INCREMENT_VERSION:
      return { ...state, dataVersion: state.dataVersion + 1 };
    
    default:
      console.warn('未知的action类型:', action.type);
      return state;
  }
};

// 创建Context
const UserContext = createContext(null);

// Provider组件
export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  
  // 使用useRef避免闭包问题
  const stateRef = useRef(state);
  const dispatchRef = useRef(dispatch);
  const isUpdatingFromStorage = useRef(false);
  
  // 更新refs
  useEffect(() => {
    stateRef.current = state;
    dispatchRef.current = dispatch;
  }, [state]);

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
    },
    
    remove: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('localStorage删除失败:', error);
      }
    }
  };

  // Actions对象
  const actions = {
    // 用户相关actions
    setUser: (user) => {
      dispatchRef.current({ type: actionTypes.SET_USER, payload: user });
      if (user) {
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, user);
      } else {
        safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.USER);
      }
    },
    
    updateUser: (updates) => {
      dispatchRef.current({ type: actionTypes.UPDATE_USER, payload: updates });
      const currentUser = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.USER, {});
      const updatedUser = { ...currentUser, ...updates };
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, updatedUser);
    },
    
    // 积分相关actions
    setPoints: (points) => {
      dispatchRef.current({ type: actionTypes.SET_POINTS, payload: points });
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.POINTS, points);
    },
    
    updatePoints: (amount, description = '') => {
      const newPoints = Math.max(0, stateRef.current.points + amount);
      dispatchRef.current({ type: actionTypes.UPDATE_POINTS, payload: amount });
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.POINTS, newPoints);
      
      // 记录积分历史
      if (amount !== 0) {
        const history = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.POINTS_HISTORY, []);
        history.unshift({
          id: Date.now(),
          amount: Math.abs(amount),
          type: amount > 0 ? 'earn' : 'spend',
          description: description || (amount > 0 ? '积分增加' : '积分消费'),
          balance: newPoints,
          timestamp: new Date().toISOString()
        });
        // 只保留最近100条记录
        if (history.length > 100) {
          history.splice(100);
        }
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.POINTS_HISTORY, history);
      }
    },
    
    // 现金相关actions
    setCash: (cash) => {
      dispatchRef.current({ type: actionTypes.SET_CASH, payload: cash });
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH, cash);
    },
    
    updateCash: (amount, description = '') => {
      const newCash = Math.max(0, stateRef.current.cashBalance + amount);
      dispatchRef.current({ type: actionTypes.UPDATE_CASH, payload: amount });
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH, newCash);
      
      // 记录现金历史
      if (amount !== 0) {
        const history = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.CASH_HISTORY, []);
        history.unshift({
          id: Date.now(),
          amount: Math.abs(amount),
          type: amount > 0 ? 'earn' : 'withdraw',
          description: description || (amount > 0 ? '现金增加' : '提现'),
          balance: newCash,
          timestamp: new Date().toISOString()
        });
        // 只保留最近100条记录
        if (history.length > 100) {
          history.splice(100);
        }
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH_HISTORY, history);
      }
    },
    
    // 娃娃相关actions
    setDolls: (dolls) => {
      dispatchRef.current({ type: actionTypes.SET_DOLLS, payload: dolls });
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, dolls);
    },
    
    addDoll: (doll) => {
      dispatchRef.current({ type: actionTypes.ADD_DOLL, payload: doll });
      const currentDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, []);
      const newDolls = [...currentDolls, doll];
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, newDolls);
    },
    
    removeDoll: (dollId) => {
      dispatchRef.current({ type: actionTypes.REMOVE_DOLL, payload: dollId });
      const currentDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, []);
      const newDolls = currentDolls.filter(doll => doll.id !== dollId);
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, newDolls);
    },
    
    updateDoll: (dollId, updates) => {
      dispatchRef.current({ type: actionTypes.UPDATE_DOLL, payload: { id: dollId, updates } });
      const currentDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS, []);
      const newDolls = currentDolls.map(doll => 
        doll.id === dollId ? { ...doll, ...updates } : doll
      );
      safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, newDolls);
    },
    
    // 状态管理actions
    setLoading: (loading) => {
      dispatchRef.current({ type: actionTypes.SET_LOADING, payload: loading });
    },
    
    setRefreshing: (refreshing) => {
      dispatchRef.current({ type: actionTypes.SET_REFRESHING, payload: refreshing });
    },
    
    setError: (error) => {
      dispatchRef.current({ type: actionTypes.SET_ERROR, payload: error });
    },
    
    clearError: () => {
      dispatchRef.current({ type: actionTypes.CLEAR_ERROR });
    },
    
    // 批量更新action - 用于数据同步
    refreshData: (data) => {
      const updates = {};
      
      if (data.user !== undefined) {
        updates.user = data.user;
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.USER, data.user);
      }
      if (data.points !== undefined) {
        updates.points = data.points;
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.POINTS, data.points);
      }
      if (data.cashBalance !== undefined) {
        updates.cashBalance = data.cashBalance;
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.CASH, data.cashBalance);
      }
      if (data.dolls !== undefined) {
        updates.dolls = data.dolls;
        safeLocalStorage.set(APP_CONSTANTS.STORAGE_KEYS.DOLLS, data.dolls);
      }
      
      dispatchRef.current({ type: actionTypes.REFRESH_DATA, payload: updates });
    },
    
    // 重置状态 - 用于退出登录
    resetState: () => {
      dispatchRef.current({ type: actionTypes.RESET_STATE });
      // 清理所有本地存储
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.USER);
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.POINTS);
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.CASH);
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.DOLLS);
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.POINTS_HISTORY);
      safeLocalStorage.remove(APP_CONSTANTS.STORAGE_KEYS.CASH_HISTORY);
    }
  };

  // 初始化时从localStorage恢复数据
  useEffect(() => {
    const initializeData = () => {
      try {
        // 恢复用户信息
        const savedUser = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.USER);
        if (savedUser) {
          actions.setUser(savedUser);
        }
        
        // 恢复积分
        const savedPoints = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.POINTS);
        if (savedPoints !== null) {
          actions.setPoints(parseInt(savedPoints) || 0);
        }
        
        // 恢复现金
        const savedCash = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.CASH);
        if (savedCash !== null) {
          actions.setCash(parseFloat(savedCash) || 0);
        }
        
        // 恢复娃娃数据
        const savedDolls = safeLocalStorage.get(APP_CONSTANTS.STORAGE_KEYS.DOLLS);
        if (savedDolls) {
          actions.setDolls(savedDolls);
        }
        
        console.log('✅ 用户数据初始化完成');
      } catch (error) {
        console.error('❌ 初始化用户数据失败:', error);
        actions.setError('数据初始化失败');
      }
    };
    
    initializeData();
  }, []);

  // 监听窗口事件 - 支持跨标签页同步（修复版）
  useEffect(() => {
    const handleStorageChange = (e) => {
      // 避免自己触发的事件
      if (isUpdatingFromStorage.current) return;
      
      isUpdatingFromStorage.current = true;
      
      try {
        if (e.key === APP_CONSTANTS.STORAGE_KEYS.POINTS) {
          const newPoints = parseInt(e.newValue) || 0;
          if (stateRef.current.points !== newPoints) {
            actions.setPoints(newPoints);
          }
        } else if (e.key === APP_CONSTANTS.STORAGE_KEYS.CASH) {
          const newCash = parseFloat(e.newValue) || 0;
          if (stateRef.current.cashBalance !== newCash) {
            actions.setCash(newCash);
          }
        } else if (e.key === APP_CONSTANTS.STORAGE_KEYS.DOLLS) {
          const newDolls = JSON.parse(e.newValue || '[]');
          if (JSON.stringify(stateRef.current.dolls) !== e.newValue) {
            actions.setDolls(newDolls);
          }
        }
      } finally {
        // 延迟重置标志，避免快速连续操作
        setTimeout(() => {
          isUpdatingFromStorage.current = false;
        }, 100);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 提供给子组件的值
  const contextValue = {
    // 状态
    ...state,
    
    // Actions
    ...actions,
    
    // 便捷方法
    purchaseDoll: async (doll) => {
      try {
        actions.setLoading(true);
        
        // 扣减积分
        actions.updatePoints(-doll.price, `购买娃娃: ${doll.name}`);
        
        // 添加新娃娃
        const newDoll = {
          ...doll,
          id: Date.now(),
          purchaseDate: new Date().toISOString(),
          status: 'active',
          daysLeft: doll.totalDays || DOLL_CONSTANTS.DEFAULT_DAYS
        };
        actions.addDoll(newDoll);
        
        console.log('✅ 娃娃购买成功:', newDoll);
        return { success: true, doll: newDoll };
      } catch (error) {
        console.error('❌ 购买娃娃失败:', error);
        actions.setError('购买娃娃失败: ' + error.message);
        return { success: false, error: error.message };
      } finally {
        actions.setLoading(false);
      }
    },
    
    recycleDoll: async (dollId) => {
      try {
        actions.setLoading(true);
        
        const currentDolls = stateRef.current.dolls;
        const doll = currentDolls.find(d => d.id === dollId);
        
        if (!doll) {
          throw new Error('娃娃不存在');
        }
        
        // 计算回收积分
        const recyclePoints = Math.floor(DOLL_CONSTANTS.RECYCLE_RATE * doll.daysLeft);
        const finalRecyclePoints = Math.max(recyclePoints, DOLL_CONSTANTS.MIN_RECYCLE_POINTS);
        
        // 增加积分
        actions.updatePoints(finalRecyclePoints, `回收娃娃: ${doll.name}`);
        
        // 移除娃娃
        actions.removeDoll(dollId);
        
        console.log('✅ 娃娃回收成功:', { dollId, recyclePoints: finalRecyclePoints });
        return { success: true, recyclePoints: finalRecyclePoints };
      } catch (error) {
        console.error('❌ 回收娃娃失败:', error);
        actions.setError('回收娃娃失败: ' + error.message);
        return { success: false, error: error.message };
      } finally {
        actions.setLoading(false);
      }
    }
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// 自定义Hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// 导出Context（用于测试）
export { UserContext };

export default UserContext;

