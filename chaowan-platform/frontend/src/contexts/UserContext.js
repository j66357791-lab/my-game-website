// frontend/src/contexts/UserContext.js - 完整修复版
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 用户相关数据
  const [points, setPoints] = useState(0);
  const [starcoin, setStarcoin] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);
  const [vipStatus, setVipStatus] = useState({});
  const [bossStatus, setBossStatus] = useState({});

  // 统一更新所有用户数据的函数
  const updateUserData = useCallback((userData) => {
    if (userData) {
      setUser(userData);
      setPoints(userData.points || 0);
      setStarcoin(userData.starcoin || 0);
      setCashBalance(userData.cashBalance || 0);
    }
  }, []);

  // 刷新数据（包含娃娃列表）
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

  // 应用启动时或刷新时，检查token并获取用户信息
  useEffect(() => {
    const initUser = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          api.setToken(savedToken);
          await refreshData();
        }
      } catch (err) {
        console.error('初始化用户失败:', err);
        setError(err.message);
        localStorage.removeItem('token');
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
    api.setToken(null);
    setError(null);
  };

  // 手动更新用户信息（局部更新）
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
    points,
    starcoin,
    cashBalance,
    dolls,
    vipStatus,
    bossStatus,
    setError
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
