// frontend/src/contexts/UserContext.js - 完整修复版
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔧 token状态
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // 用户相关数据
  const [points, setPoints] = useState(0);
  const [starcoin, setStarcoin] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);
  const [vipStatus, setVipStatus] = useState({});
  const [bossStatus, setBossStatus] = useState({});

  // 🔥 新增：获取娃娃列表
  const fetchUserDolls = useCallback(async () => {
    try {
      const response = await api.get('/dolls/user-dolls');
      if (response.data.success) {
        setDolls(response.data.data.dolls || []);
        return response.data.data.dolls;
      }
    } catch (err) {
      console.error('获取娃娃列表失败:', err);
    }
    return [];
  }, []);

  // 统一更新所有用户数据的函数
  const updateUserData = (userData) => {
    setUser(userData);
    setPoints(userData.points || 0);
    setStarcoin(userData.starcoin || 0);
    setCashBalance(userData.cashBalance || 0);
  };

  // 🔥 新增：刷新数据（包含娃娃列表）
  const refreshData = useCallback(async (userData) => {
    if (userData) {
      updateUserData(userData);
    }
    // 同时刷新娃娃列表
    await fetchUserDolls();
  }, [fetchUserDolls]);

  // 应用启动时或刷新时，检查token并获取用户信息
  useEffect(() => {
    const initUser = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          setToken(savedToken);
          const data = await api.getUser();
          if (data.success) {
            updateUserData(data.data.user);
            // 初始化时也获取娃娃列表
            await fetchUserDolls();
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError(err.message);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [fetchUserDolls]);

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
        updateUserData(userData);
        // 登录后获取娃娃列表
        await fetchUserDolls();
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
    setError(null);
  };

  // 手动更新用户信息（局部更新）
  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    if (newUserData.points !== undefined) setPoints(newUserData.points);
    if (newUserData.starcoin !== undefined) setStarcoin(newUserData.starcoin);
    if (newUserData.cashBalance !== undefined) setCashBalance(newUserData.cashBalance);
  };

  // 🔥 新增：手动设置娃娃列表
  const setDollsData = useCallback((newDolls) => {
    setDolls(Array.isArray(newDolls) ? newDolls : []);
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    updateUser,
    refreshData,
    fetchUserDolls,
    setDollsData,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
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
