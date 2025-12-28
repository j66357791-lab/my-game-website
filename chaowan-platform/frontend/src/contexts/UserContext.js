// frontend/src/contexts/UserContext.js - 最终修复版 (增加持久化)
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Token 状态
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // 用户相关数据
  const [points, setPoints] = useState(0);
  const [starcoin, setStarcoin] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);
  const [vipStatus, setVipStatus] = useState({});
  const [bossStatus, setBossStatus] = useState({});
  
  // 🔥 优化1：从 localStorage 读取今日赢取积分
  const savedWins = localStorage.getItem('todayWins');
  const [todayWins, setTodayWins] = useState(savedWins ? parseInt(savedWins, 10) : 0);
  
  // 🔥 优化2：从 localStorage 读取上次检查日期
  const savedCheckDate = localStorage.getItem('lastTaskCheckDate');
  const [lastTaskCheckDate, setLastTaskCheckDate] = useState(savedCheckDate || '');

  // 统一更新所有用户数据的函数
  const updateUserData = useCallback((userData) => {
    if (userData) {
      setUser(userData);
      setPoints(userData.points || 0);
      setStarcoin(userData.starcoin || 0);
      setCashBalance(userData.cashBalance || 0);
    }
  }, []);

  // 获取娃娃列表
  const fetchUserDolls = useCallback(async () => {
    try {
      const response = await api.get('/dolls/user-dolls');
      if (response.success && response.data) {
        setDolls(response.data.dolls || []);
      }
    } catch (err) {
      console.error('获取娃娃列表失败:', err);
    }
  }, []);

  // 刷新数据
  const refreshData = useCallback(async () => {
    try {
      const [userData, dollsData] = await Promise.all([
        api.getUser(),
        api.get('/dolls/user-dolls')
      ]);
      
      if (userData.success && userData.data) {
        updateUserData(userData.data.user);
      }
      
      if (dollsData.success && dollsData.data) {
        setDolls(dollsData.data.dolls || []);
      }
    } catch (err) {
      console.error('刷新数据失败:', err);
      setError(err.message);
    }
  }, [updateUserData]);

  // 应用启动时检查token
  useEffect(() => {
    const initUser = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          setToken(savedToken);
          api.setToken(savedToken);
          await refreshData();
        }
      } catch (err) {
        console.error('初始化用户失败:', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [refreshData]);

  // 登录函数
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.login(credentials.email, credentials.password);
      
      if (data.success) {
        const { user: userData, token: newToken } = data.data;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        api.setToken(newToken);
        updateUserData(userData);
        await refreshData();
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    setUser(null);
    setPoints(0);
    setStarcoin(0);
    setCashBalance(0);
    setDolls([]);
    setVipStatus({});
    setBossStatus({});
    localStorage.removeItem('token');
    setToken(null);
    api.setToken(null);
    setError(null);
    // 可选：登出时是否清除今日任务进度？通常保留比较好
  };

  // 更新每日赢取积分
  const updateTodayWins = useCallback((amount) => {
    setTodayWins(prev => {
      const newVal = prev + amount;
      console.log(`💰 更新今日赢取: ${prev} + ${amount} = ${newVal}`);
      return newVal;
    });
  }, []);

  // 🔥 优化3：持久化 todayWins 和检查日期
  useEffect(() => {
    localStorage.setItem('todayWins', todayWins);
  }, [todayWins]);

  useEffect(() => {
    localStorage.setItem('lastTaskCheckDate', lastTaskCheckDate);
  }, [lastTaskCheckDate]);

  // 检查并重置每日任务
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastTaskCheckDate !== today) {
      console.log(`📅 日期变更: ${lastTaskCheckDate} -> ${today}, 重置任务进度`);
      setTodayWins(0);
      setLastTaskCheckDate(today);
    }
  }, [lastTaskCheckDate]);

  // 手动更新用户信息
  const updateUser = useCallback((newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    if (newUserData.points !== undefined) setPoints(newUserData.points);
    if (newUserData.starcoin !== undefined) setStarcoin(newUserData.starcoin);
    if (newUserData.cashBalance !== undefined) setCashBalance(newUserData.cashBalance);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    refreshData,
    fetchUserDolls,
    points,
    starcoin,
    cashBalance,
    dolls,
    vipStatus,
    bossStatus,
    setError,
    token,
    todayWins,
    updateTodayWins
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default UserContext;
