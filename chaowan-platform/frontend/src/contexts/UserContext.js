// frontend/src/contexts/UserContext.js - 修复token导出
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔧 关键修复：添加token状态
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // 用户相关数据
  const [points, setPoints] = useState(0);
  const [starcoin, setStarcoin] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);
  const [vipStatus, setVipStatus] = useState({});
  const [bossStatus, setBossStatus] = useState({});

  // 统一更新所有用户数据的函数
  const updateUserData = (userData) => {
    setUser(userData);
    setPoints(userData.points || 0);
    setStarcoin(userData.starcoin || 0);
    setCashBalance(userData.cashBalance || 0);
    setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
  };

  // 应用启动时或刷新时，检查token并获取用户信息
  useEffect(() => {
    const initUser = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          setToken(savedToken); // 🔧 设置token状态
          const data = await api.getUser();
          if (data.success) {
            updateUserData(data.data.user);
          } else {
            localStorage.removeItem('token');
            setToken(null); // 🔧 清除token
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError(err.message);
        localStorage.removeItem('token');
        setToken(null); // 🔧 清除token
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  // 登录函数
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.login(credentials.email, credentials.password);
      
      if (data.success) {
        const { user: userData, token: newToken } = data.data;
        localStorage.setItem('token', newToken);
        setToken(newToken); // 🔧 设置token状态
        updateUserData(userData);
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
    setToken(null); // 🔧 清除token状态
    setError(null);
  };

  // 手动更新用户信息
  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    if (newUserData.points !== undefined) setPoints(newUserData.points);
    if (newUserData.starcoin !== undefined) setStarcoin(newUserData.starcoin);
    if (newUserData.cashBalance !== undefined) setCashBalance(newUserData.cashBalance);
    if (newUserData.dolls !== undefined) setDolls(Array.isArray(newUserData.dolls) ? newUserData.dolls : []);
  };

  // 🔧 关键修复：在value中包含token
  const value = {
    user,
    token, // 🔧 添加token到value中
    loading,
    error,
    login,
    logout,
    updateUser,
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
