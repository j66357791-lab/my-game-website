import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔧 添加缺失的状态
  const [points, setPoints] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);

  useEffect(() => {
    const initUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // 🔧 修复API调用
          const response = await api.request('/auth/user', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.success) {
            const userData = response.data.user;
            setUser(userData);
            
            // 🔧 初始化用户数据
            setPoints(userData.points || 0);
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
      const response = await api.login(credentials.email, credentials.password);
      
      if (response.success) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('token', response.data.token);
        
        // 🔧 更新用户数据
        setPoints(userData.points || 0);
        setCashBalance(userData.cashBalance || 0);
        setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
      }
      
      return response;
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
    setCashBalance(0);
    setDolls([]);
    localStorage.removeItem('token');
    setError(null);
  };

  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    
    // 🔧 更新相关数据
    if (newUserData.points !== undefined) {
      setPoints(newUserData.points);
    }
    if (newUserData.cashBalance !== undefined) {
      setCashBalance(newUserData.cashBalance);
    }
    if (newUserData.dolls !== undefined) {
      setDolls(Array.isArray(newUserData.dolls) ? newUserData.dolls : []);
    }
  };

  // 🔧 添加缺失的函数
  const updatePoints = (newPoints) => {
    setPoints(newPoints);
    localStorage.setItem('userPoints', newPoints.toString());
  };

  const updateCash = (newCash) => {
    setCashBalance(newCash);
    localStorage.setItem('userCashBalance', newCash.toString());
  };

  const addDoll = (doll) => {
    if (doll && doll.id) {
      const newDolls = [...dolls, doll];
      setDolls(newDolls);
      localStorage.setItem('userDolls', JSON.stringify(newDolls));
    }
  };

  const removeDoll = (dollId) => {
    const newDolls = dolls.filter(doll => doll.id !== dollId);
    setDolls(newDolls);
    localStorage.setItem('userDolls', JSON.stringify(newDolls));
  };

  const refreshData = (data) => {
    if (data.points !== undefined) {
      setPoints(data.points);
      localStorage.setItem('userPoints', data.points.toString());
    }
    if (data.cashBalance !== undefined) {
      setCashBalance(data.cashBalance);
      localStorage.setItem('userCashBalance', data.cashBalance.toString());
    }
    if (data.dolls !== undefined) {
      const safeDolls = Array.isArray(data.dolls) ? data.dolls : [];
      setDolls(safeDolls);
      localStorage.setItem('userDolls', JSON.stringify(safeDolls));
    }
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
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
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    
    // 🔧 新增的状态和函数
    points,
    cashBalance,
    dolls,
    updatePoints,
    updateCash,
    addDoll,
    removeDoll,
    refreshData,
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
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
