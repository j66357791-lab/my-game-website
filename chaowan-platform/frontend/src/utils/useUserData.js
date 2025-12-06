// src/hooks/useUserData.js
import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';
import { dollService } from '../services/dollService';
import { dataSync } from '../utils/dataSync';

export const useUserData = () => {
  const userContext = useUser();
  const [refreshing, setRefreshing] = useState(false);

  // 刷新用户数据
  const refreshUserData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 并行获取用户数据、娃娃数据
      const [userData, dollsData] = await Promise.all([
        userService.getUserData(token),
        dollService.getMyDolls(token)
      ]);

      // 同步数据
      dataSync.syncUserData({
        user: userData.user,
        points: userData.points,
        cashBalance: userData.cashBalance,
        dolls: dollsData.dolls
      });

    } catch (error) {
      console.error('刷新用户数据失败:', error);
      userContext.setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // 购买娃娃
  const purchaseDoll = async (doll) => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await dollService.purchaseDoll(doll.id, token);
      
      // 同步购买结果
      dataSync.syncAfterPurchase(result);
      
      // 更新全局状态
      if (result.newPoints !== undefined) {
        userContext.setPoints(result.newPoints);
      }
      if (result.newDoll) {
        userContext.addDoll(result.newDoll);
      }
      
      return result;
    } catch (error) {
      console.error('购买娃娃失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 回收娃娃
  const recycleDoll = async (dollId) => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await dollService.recycleDoll(dollId, token);
      
      // 同步回收结果
      dataSync.syncAfterRecycle(result);
      
      // 更新全局状态
      if (result.recyclePoints !== undefined) {
        userContext.updatePoints(result.recyclePoints, `回收娃娃获得积分`);
      }
      if (result.dollId) {
        userContext.removeDoll(result.dollId);
      }
      
      return result;
    } catch (error) {
      console.error('回收娃娃失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 签到
  const checkin = async () => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await userService.checkin(token);
      
      // 更新积分和经验
      if (result.points !== undefined) {
        userContext.updatePoints(result.points, '每日签到奖励');
      }
      if (result.experience !== undefined) {
        const updatedUser = {
          ...userContext.user,
          experience: result.experience,
          level: result.level
        };
        userContext.setUser(updatedUser);
      }
      
      return result;
    } catch (error) {
      console.error('签到失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 初始化时刷新数据
  useEffect(() => {
    if (userContext.user) {
      refreshUserData();
    }
  }, []);

  return {
    ...userContext,
    refreshing,
    refreshUserData,
    purchaseDoll,
    recycleDoll,
    checkin
  };
};
