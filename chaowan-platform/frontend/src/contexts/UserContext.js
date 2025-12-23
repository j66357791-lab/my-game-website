// frontend/src/contexts/UserContext.js - 完整修复版（含 fetchUserDolls）
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../config/api'; // ✅ 使用默认导入

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

  // 🔥 新增：获取娃娃列表（用于局部刷新，不影响用户积分）
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

  // 刷新数据（包含娃娃列表）
  const refreshData = useCallback(async () => {
    try {
      // 并行请求，提高速度
      const [userData, dollsData] = await Promise.all([
        api.getUser(),
        api.get('/dolls/user-dolls')
      ]);
      
      // 更新用户信息（积分、星源币）
      if (userData.success && userData.data) {
        // 注意：根据后端实际返回结构调整这里
        // 如果后端返回 { success: true, data: { user: {...} } }
        updateUserData(userData.data.user);
        // 如果后端直接返回用户对象在 data 中，则改为:
        // updateUserData(userData.data);
      }
      
      // 更新娃娃列表
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
          api.setToken(savedToken); // ✅ 调用 api.js 中的 setToken
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
        api.setToken(newToken); // ✅ 调用 api.js 中的 setToken
        updateUserData(userData);
        await refreshData(); // 登录后刷新完整数据
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
    api.setToken(null); // ✅ 清除 token
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
    fetchUserDolls, // ✅ 必须导出这个，否则 DollCenterPage 会报错
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
