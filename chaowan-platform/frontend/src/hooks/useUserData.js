// frontend/src/hooks/useUserData.js - 完整修复版本
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';
import { dollService } from '../services/dollService';
import { vipService } from '../services/vipService';
import { bossService } from '../services/bossService';
import { dataSync } from '../utils/dataSync';
import { debounce } from '../utils/performance';

export const useUserData = () => {
  const userContext = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 强制刷新用户数据
  const forceRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const currentVersion = Date.now();
      
      // 并行获取所有数据 - 不再传递token
      const [userData, dollsData, vipData, bossData] = await Promise.all([
        userService.getUserData(),
        dollService.getMyDolls(),
        vipService.getVipStatus(),
        bossService.getBossStatus()
      ]);

      // 统一数据格式
      const syncData = {
        user: userData.user,
        points: userData.user.points || 0,
        starcoin: userData.user.starcoin || 0, // 确保星源币字段
        cashBalance: userData.user.cashBalance || 0,
        dolls: dollsData.dolls || [],
        vipStatus: vipData.data || {},
        bossStatus: bossData.data || {},
        version: currentVersion
      };

      console.log('同步数据:', syncData);
      
      // 使用dataSync同步到UserContext
      dataSync.syncUserData(syncData, userContext);
      setLastSyncTime(currentVersion);
      
    } catch (error) {
      console.error('刷新用户数据失败:', error);
      userContext.setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, userContext]);

  // 防抖刷新
  const debouncedRefresh = useCallback(
    debounce(forceRefresh, 1000),
    [forceRefresh]
  );

  // 购买VIP卡 - 不再传递token
  const purchaseVipCard = async (type) => {
    try {
      userContext.setLoading(true);
      
      const result = await vipService.purchaseVipCard(type);
      
      // 立即刷新数据
      await forceRefresh();
      
      return result;
    } catch (error) {
      console.error('购买VIP卡失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 领取每日星源币 - 不再传递token
  const claimDailyStarcoin = async () => {
    try {
      userContext.setLoading(true);
      
      const result = await vipService.claimDailyStarcoin();
      
      // 立即刷新数据
      await forceRefresh();
      
      return result;
    } catch (error) {
      console.error('领取星源币失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 攻击Boss - 不再传递token
  const attackBoss = async (bossId, damage) => {
    try {
      userContext.setLoading(true);
      
      const result = await bossService.attackBoss(bossId, damage);
      
      // 立即刷新数据
      await forceRefresh();
      
      return result;
    } catch (error) {
      console.error('攻击Boss失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 初始化时刷新数据
  useEffect(() => {
    if (userContext.user && !lastSyncTime) {
      forceRefresh();
    }
  }, [userContext.user?.id]);

  // 页面可见性变化时刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userContext.user) {
        forceRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userContext.user, forceRefresh]);

  return {
    ...userContext,
    refreshing,
    refreshUserData: debouncedRefresh,
    forceRefresh,
    purchaseVipCard,
    claimDailyStarcoin,
    attackBoss
  };
};
