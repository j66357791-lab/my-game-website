// frontend/src/contexts/UserContext.js - 最终完整版
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 初始加载状态
  const [error, setError] = useState(null);
  
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
        const token = localStorage.getItem('token');
        if (token) {
          const data = await api.getUser();
          if (data.success) {
            updateUserData(data.data.user);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError(err.message);
        localStorage.removeItem('token');
      } finally {
        setLoading(false); // 无论成功失败，初始加载结束
      }
    };

    initUser();
  }, []);

  // 登录函数
  const login = async (credentials) => {
    try {
      setLoading(true); // 开始登录流程，显示加载
      setError(null);
      const data = await api.login(credentials.email, credentials.password);
      
      if (data.success) {
        const { user: userData, token } = data.data;
        localStorage.setItem('token', token);
        updateUserData(userData); // 统一更新数据
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false); // 登录请求结束
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
    setError(null);
  };

  // 手动更新用户信息（例如签到、收益后）
  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    if (newUserData.points !== undefined) setPoints(newUserData.points);
    if (newUserData.starcoin !== undefined) setStarcoin(newUserData.starcoin);
    if (newUserData.cashBalance !== undefined) setCashBalance(newUserData.cashBalance);
    if (newUserData.dolls !== undefined) setDolls(Array.isArray(newUserData.dolls) ? newUserData.dolls : []);
  };

  const value = {
    user,
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
