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
          const response = await fetch('https://tianchuang.onrender.com/api/auth/user', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
              const userData = data.data.user;
              setUser(userData);
              
              // 🔧 初始化用户数据
              setPoints(userData.points || 0);
              setCashBalance(userData.cashBalance || 0);
              setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
              
              // 🔧 获取用户娃娃列表
              fetchUserDolls();
            }
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
      const response = await fetch('https://tianchuang.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const userData = data.data.user;
          setUser(userData);
          localStorage.setItem('token', data.data.token);
          
          // 🔧 更新用户数据
          setPoints(userData.points || 0);
          setCashBalance(userData.cashBalance || 0);
          setDolls(Array.isArray(userData.dolls) ? userData.dolls : []);
          
          // 🔧 获取用户娃娃列表
          fetchUserDolls();
        }
        
        return data;
      } else {
        throw new Error(data.message || '登录失败');
      }
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

  const updateCash = (newCash, description = '') => {
    setCashBalance(newCash);
    localStorage.setItem('userCashBalance', newCash.toString());
    
    // 如果是提现，更新用户数据
    if (user) {
      updateUser({ ...user, cashBalance: newCash });
    }
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

  // 🔧 修复：购买娃娃方法 - 完善错误处理
  const purchaseDoll = async (doll) => {
    try {
      setLoading(true);
      setError(null); // 清除之前的错误
      
      console.log(`🧸 开始购买娃娃:`, doll);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      const response = await fetch('https://tianchuang.onrender.com/api/dolls/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dollId: doll.id,
          dollLevel: doll.level
        })
      });

      console.log(`📡 购买请求响应状态:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 购买请求失败: ${response.status}`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📦 购买响应数据:`, data);

      if (data.success) {
        // 🔧 只有在API成功时才更新本地状态
        const newDoll = {
          id: data.data.doll._id,
          name: data.data.doll.name,
          emoji: data.data.doll.emoji,
          level: data.data.doll.level,
          output: data.data.doll.productionPerDay,
          daysLeft: data.data.doll.remainingDays,
          totalDays: data.data.doll.totalDays,
          totalEarned: data.data.doll.totalProduced,
          status: data.data.doll.isExpired ? 'expired' : 'active'
        };
        
        // 更新积分
        updatePoints(data.data.userPoints);
        
        // 添加娃娃到列表
        addDoll(newDoll);
        
        // 保存到localStorage
        localStorage.setItem('userPoints', data.data.userPoints.toString());
        
        console.log(`✅ 购买成功，娃娃已添加:`, newDoll);
        
        return { success: true, doll: newDoll };
      } else {
        throw new Error(data.message || '购买失败');
      }
    } catch (error) {
      console.error('❌ 购买娃娃失败:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🔧 修复：回收娃娃方法
  const recycleDoll = async (dollId) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tianchuang.onrender.com/api/dolls/${dollId}/recycle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // 更新积分和经验
        updatePoints(data.data.userPoints);
        
        // 移除娃娃
        removeDoll(dollId);
        
        // 保存到localStorage
        localStorage.setItem('userPoints', data.data.userPoints.toString());
        
        return { 
          success: true, 
          recyclePoints: data.data.recyclePoints,
          experience: data.data.experience
        };
      } else {
        throw new Error(data.message || '回收失败');
      }
    } catch (error) {
      console.error('❌ 回收娃娃失败:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🔧 新增：获取用户娃娃列表
  const fetchUserDolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/dolls/my', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        const dolls = data.data.dolls.map(doll => ({
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
    setError,
    
    // 🔧 新增方法
    purchaseDoll,
    recycleDoll,
    fetchUserDolls
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
