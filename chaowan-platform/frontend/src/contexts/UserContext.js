// frontend/src/contexts/UserContext.js - 完整修复版本
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 添加所有需要的状态
  const [points, setPoints] = useState(0);
  const [starcoin, setStarcoin] = useState(0); // 添加星源币状态
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);
  const [vipStatus, setVipStatus] = useState({});
  const [bossStatus, setBossStatus] = useState({});

  useEffect(() => {
    const initUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // 使用api对象
          const data = await api.getUser();
          
          if (data.success) {
            const userData = data.data.user;
            setUser(userData);
            
            // 初始化所有用户数据
            setPoints(userData.points || 0);
            setStarcoin(userData.starcoin || 0); // 初始化星源币
            setCashBalance(userData.cashBalance || 0);
            setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError(err.message);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const data = await api.login(credentials.email, credentials.password);
      
      if (data.success) {
        const userData = data.data.user;
        setUser(userData);
        localStorage.setItem('token', data.data.token);
        
        // 更新所有用户数据
        setPoints(userData.points || 0);
        setStarcoin(userData.starcoin || 0); // 更新星源币
        setCashBalance(userData.cashBalance || 0);
        setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setPoints(0);
    setStarcoin(0); // 清除星源币
    setCashBalance(0);
    setDolls([]);
    setVipStatus({});
    setBossStatus({});
    localStorage.removeItem('token');
    setError(null);
  };

  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    
    // 更新相关数据
    if (newUserData.points !== undefined) {
      setPoints(newUserData.points);
    }
    if (newUserData.starcoin !== undefined) {
      setStarcoin(newUserData.starcoin); // 更新星源币
    }
    if (newUserData.cashBalance !== undefined) {
      setCashBalance(newUserData.cashBalance);
    }
    if (newUserData.dolls !== undefined) {
      setDolls(Array.isArray(newUserData.dolls) ? newUserData.dolls : []);
    }
  };

  // 批量更新数据
  const updateAllData = (data) => {
    if (data.user) {
      updateUser(data.user);
    }
    if (data.points !== undefined) {
      setPoints(data.points);
    }
    if (data.starcoin !== undefined) {
      setStarcoin(data.starcoin);
    }
    if (data.cashBalance !== undefined) {
      setCashBalance(data.cashBalance);
    }
    if (data.dolls !== undefined) {
      setDolls(Array.isArray(data.dolls) ? data.dolls : []);
    }
    if (data.vipStatus !== undefined) {
      setVipStatus(data.vipStatus);
    }
    if (data.bossStatus !== undefined) {
      setBossStatus(data.bossStatus);
    }
  };

  const value = {
    // 原有状态
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    updateAllData, // 添加批量更新方法
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    
    // 所有状态
    points,
    starcoin, // 导出星源币
    cashBalance,
    dolls,
    vipStatus,
    bossStatus,
    
    // 设置方法
    setPoints,
    setStarcoin,
    setCashBalance,
    setDolls,
    setVipStatus,
    setBossStatus,
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
