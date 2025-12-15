// frontend/src/contexts/UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';
import { userService } from '../services/userService';
import { dollService } from '../services/dollService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔧 新玩法核心状态
  const [integral, setIntegral] = useState(0);
  const [starcoin, setStarcoin] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [vipDaysLeft, setVipDaysLeft] = useState(0);
  const [dolls, setDolls] = useState([]); // 存储用户背包中的娃娃
  const [deployedDolls, setDeployedDolls] = useState([]); // 存储出战娃娃

  // --- 数据获取函数 ---

  // 🔧 核心函数：从云端获取并设置用户数据
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      // 1. 获取用户基本信息
      const userResponse = await userService.getUserData(token);
      if (userResponse.success) {
        const userData = userResponse.data.user;
        setUser(userData);
        setIntegral(userData.integral || 0);
        setStarcoin(userData.starcoin || 0);
        setCashBalance(userData.cashBalance || 0);
        setVipDaysLeft(userData.vip_days_left || 0);
      } else {
        throw new Error(userResponse.message || '获取用户信息失败');
      }

      // 2. 获取用户娃娃列表 (背包和出战)
      await fetchUserDolls();
      await fetchDeployedDolls();

    } catch (err) {
      console.error('初始化用户数据失败:', err);
      setError(err.message);
      if (err.response?.status === 401) {
          localStorage.removeItem('token');
          setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取用户背包中的娃娃
  const fetchUserDolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await dollService.getDollInventory(token); // 🔧 修正：使用 dollService
      if (response.success) {
        setDolls(response.data.dolls || []);
      }
    } catch (error) {
      console.error('获取娃娃列表失败:', error);
    }
  };

  // 获取出战位的娃娃
  const fetchDeployedDolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await dollService.getDeploymentSlots(token);
      if (response.success) {
        setDeployedDolls(response.data.dolls || []);
      }
    } catch (error) {
      console.error('获取出战娃娃失败:', error);
    }
  };

  // --- 生命周期与认证 ---
  
  useEffect(() => {
    fetchUserData();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/auth/login', credentials);
      
      if (response.success) {
        localStorage.setItem('token', response.data.token);
        await fetchUserData();
      } else {
        throw new Error(response.message || '登录失败');
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
    setIntegral(0);
    setStarcoin(0);
    setCashBalance(0);
    setVipDaysLeft(0);
    setDolls([]); // 🔧 补充：清空娃娃状态
    setDeployedDolls([]); // 🔧 补充：清空出战娃娃状态
    setError(null);
    localStorage.removeItem('token');
  };

  // --- 状态更新函数 ---

  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
    if (newUserData.integral !== undefined) setIntegral(newUserData.integral);
    if (newUserData.starcoin !== undefined) setStarcoin(newUserData.starcoin);
    if (newUserData.cashBalance !== undefined) setCashBalance(newUserData.cashBalance);
    if (newUserData.vip_days_left !== undefined) setVipDaysLeft(newUserData.vip_days_left);
    if (newUserData.dolls !== undefined) setDolls(Array.isArray(newUserData.dolls) ? newUserData.dolls : []);
    if (newUserData.deployedDolls !== undefined) setDeployedDolls(Array.isArray(newUserData.deployedDolls) ? newUserData.deployedDolls : []);
  };

  // --- 业务操作函数 ---

  // VIP相关
  const purchaseVipCard = async (cardType) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const result = await userService.purchaseVipCard(cardType, token);
      if (result.success) {
        alert(result.message);
        await fetchUserData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('购买失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const claimDailyVipReward = async () => {
    try {
        const token = localStorage.getItem('token');
        const result = await userService.claimDailyVipReward(token);
        if (result.success) {
            alert(result.message);
            await fetchUserData();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('领取失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 娃娃相关
  const drawDoll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const result = await dollService.drawDoll(token); // 🔧 修正：使用 dollService
      if (result.success) {
        alert(`恭喜！您抽取到了 ${result.data.doll.name}`);
        await fetchUserData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('抽取失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 🔧 新增：派遣娃娃出战
  const deployDoll = async (dollId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const result = await dollService.deployDoll(dollId, token);
      if (result.success) {
        alert(result.message);
        await fetchUserDolls();
        await fetchDeployedDolls();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('出战失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 🔧 新增：召回娃娃
  const recallDoll = async (dollId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const result = await dollService.recallDoll(dollId, token);
      if (result.success) {
        alert(result.message);
        await fetchUserDolls();
        await fetchDeployedDolls();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('召回失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 🔧 新增：合成娃娃
  const synthesizeDoll = async (baseDollId, materialDollIds) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const result = await dollService.synthesizeDoll(baseDollId, materialDollIds, token);
      if (result.success) {
        alert(result.message);
        await fetchUserDolls(); // 合成只影响背包
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('合成失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const value = {
    // 状态
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    
    // 用户数据
    integral,
    starcoin,
    cashBalance,
    vipDaysLeft,
    dolls,
    deployedDolls, // 🔧 暴露出战娃娃状态
    
    // 方法
    login,
    logout,
    setError,
    fetchUserData,
    updateUser,
    purchaseVipCard,
    claimDailyVipReward,
    drawDoll,
    deployDoll, // 🔧 暴露新方法
    recallDoll, // 🔧 暴露新方法
    synthesizeDoll, // 🔧 暴露新方法
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
