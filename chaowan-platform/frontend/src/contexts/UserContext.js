// frontend/src/contexts/UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 用户数据状态
  const [points, setPoints] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [dolls, setDolls] = useState([]);

  // 🔧 初始化用户数据
  useEffect(() => {
    const initUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // 获取用户信息
          const response = await api.get('/auth/user');
          
          if (response.success) {
            const userData = response.data.user;
            setUser(userData);
            
            // 初始化用户数据
            setPoints(userData.points || 0);
            setCashBalance(userData.cashBalance || 0);
            setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
            
            // 获取用户娃娃列表
            fetchUserDolls();
          } else {
            throw new Error(response.message || '获取用户信息失败');
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

  // 登录功能
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', credentials);
      
      if (response.success) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('token', response.data.token);
        
        // 更新用户数据
        setPoints(userData.points || 0);
        setCashBalance(userData.cashBalance || 0);
        setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
        
        // 获取用户娃娃列表
        fetchUserDolls();
      }
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出功能
  const logout = () => {
    setUser(null);
    setPoints(0);
    setCashBalance(0);
    setDolls([]);
    localStorage.removeItem('token');
    setError(null);
  };

  // 更新用户信息
  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    
    // 更新相关数据
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

  // 更新积分
  const updatePoints = (newPoints) => {
    const updatedPoints = typeof newPoints === 'number' ? newPoints : points + newPoints;
    setPoints(updatedPoints);
    localStorage.setItem('userPoints', updatedPoints.toString());
    
    // 同步更新用户对象
    if (user) {
      updateUser({ ...user, points: updatedPoints });
    }
  };

  // 更新现金
  const updateCash = (newCash, description = '') => {
    setCashBalance(newCash);
    localStorage.setItem('userCashBalance', newCash.toString());
    
    // 如果是提现，更新用户数据
    if (user) {
      updateUser({ ...user, cashBalance: newCash });
    }
  };

  // 添加娃娃
  const addDoll = (doll) => {
    if (doll && doll.id) {
      const newDolls = [...dolls, doll];
      setDolls(newDolls);
      localStorage.setItem('userDolls', JSON.stringify(newDolls));
    }
  };

  // 移除娃娃
  const removeDoll = (dollId) => {
    const newDolls = dolls.filter(doll => doll.id !== dollId);
    setDolls(newDolls);
    localStorage.setItem('userDolls', JSON.stringify(newDolls));
  };

  // 刷新数据
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

  // 购买娃娃
  const purchaseDoll = async (doll) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🧸 开始购买娃娃:`, doll);
      
      const response = await api.post('/dolls/purchase', {
        dollId: doll.id,
        dollLevel: doll.level
      });

      console.log(`📦 购买响应数据:`, response);

      if (response.success) {
        // 构建新娃娃对象
        const newDoll = {
          id: response.data.doll._id,
          name: response.data.doll.name,
          emoji: response.data.doll.emoji,
          level: response.data.doll.level,
          output: response.data.doll.productionPerDay,
          daysLeft: response.data.doll.remainingDays,
          totalDays: response.data.doll.totalDays,
          totalEarned: response.data.doll.totalProduced,
          status: response.data.doll.isExpired ? 'expired' : 'active'
        };
        
        // 更新积分
        updatePoints(response.data.userPoints);
        
        // 添加娃娃到列表
        addDoll(newDoll);
        
        console.log(`✅ 购买成功，娃娃已添加:`, newDoll);
        
        return { success: true, doll: newDoll };
      } else {
        throw new Error(response.message || '购买失败');
      }
    } catch (error) {
      console.error('❌ 购买娃娃失败:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 回收娃娃
  const recycleDoll = async (dollId) => {
    try {
      setLoading(true);
      
      const response = await api.post(`/dolls/${dollId}/recycle`);

      if (response.success) {
        // 更新积分和经验
        updatePoints(response.data.userPoints);
        
        // 移除娃娃
        removeDoll(dollId);
        
        return { 
          success: true, 
          recyclePoints: response.data.recyclePoints,
          experience: response.data.experience
        };
      } else {
        throw new Error(response.message || '回收失败');
      }
    } catch (error) {
      console.error('❌ 回收娃娃失败:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 获取用户娃娃列表
  const fetchUserDolls = async () => {
    try {
      const response = await api.get('/dolls/my');

      if (response.success) {
        const dolls = response.data.dolls.map(doll => ({
          id: doll._id,
          name: doll.name,
          emoji: doll.emoji,
          level: doll.level,
          output: doll.productionPerDay,
          daysLeft: doll.remainingDays,
          totalDays: doll.totalDays,
          totalEarned: doll.totalProduced,
          status: doll.isExpired ? 'expired' : 'active'
        }));
        
        setDolls(dolls);
        localStorage.setItem('userDolls', JSON.stringify(dolls));
      }
    } catch (error) {
      console.error('❌ 获取娃娃列表失败:', error);
    }
  };

  // 🔧 新增：获取用户交易记录
  const fetchTransactions = async (type = 'all') => {
    try {
      const response = await api.get(`/points/history${type !== 'all' ? `?type=${type}` : ''}`);
      return response;
    } catch (error) {
      console.error('❌ 获取交易记录失败:', error);
      throw error;
    }
  };

  // 🔧 新增：获取用户现金记录
  const fetchCashTransactions = async () => {
    try {
      const response = await api.get('/transactions/cash');
      return response;
    } catch (error) {
      console.error('❌ 获取现金记录失败:', error);
      throw error;
    }
  };

  // 🔧 新增：获取提现记录
  const fetchWithdrawHistory = async () => {
    try {
      const response = await api.get('/withdrawal/my');
      return response;
    } catch (error) {
      console.error('❌ 获取提现记录失败:', error);
      throw error;
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
    
    // 用户数据状态
    points,
    cashBalance,
    dolls,
    updatePoints,
    updateCash,
    addDoll,
    removeDoll,
    refreshData,
    setError,
    
    // 方法
    purchaseDoll,
    recycleDoll,
    fetchUserDolls,
    fetchTransactions,
    fetchCashTransactions,
    fetchWithdrawHistory
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
