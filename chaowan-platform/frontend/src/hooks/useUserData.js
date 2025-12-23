// frontend/src/hooks/useUserData.js - 修复函数错误
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { dollService } from '../services/dollService';
import { vipService } from '../services/vipService';
import { bossService } from '../services/bossService';

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
      
      console.log('🔄 开始刷新用户数据...');
      
      // 并行获取所有数据，但处理可能的错误
      const promises = [
        userContext.refreshData().catch(err => {
          console.error('刷新用户数据失败:', err);
          return null;
        }),
        dollService.getMyDolls().catch(err => {
          console.error('获取娃娃数据失败:', err);
          return { dolls: [] };
        }),
        vipService.getVipStatus().catch(err => {
          console.error('获取VIP状态失败:', err);
          return { data: {} };
        }),
        bossService.getBossStatus().catch(err => {
          console.error('获取Boss状态失败:', err);
          return { data: {} };
        })
      ];
      
      const results = await Promise.allSettled(promises);
      
      // 统一数据格式
      const syncData = {
        user: results[0].status === 'fulfilled' ? results[0].value?.user : null,
        points: results[0].status === 'fulfilled' ? results[0].value?.points : 0,
        starcoin: results[0].status === 'fulfilled' ? results[0].value?.starcoin : 0,
        cashBalance: results[0].status === 'fulfilled' ? results[0].value?.cashBalance : 0,
        dolls: results[1].status === 'fulfilled' ? results[1].value?.dolls : [],
        vipStatus: results[2].status === 'fulfilled' ? results[2].value?.data : {},
        bossStatus: results[3].status === 'fulfilled' ? results[3].value?.data : {},
        version: currentVersion
      };

      console.log('📊 同步数据:', syncData);
      
      setLastSyncTime(currentVersion);
      
    } catch (error) {
      console.error('❌ 刷新用户数据失败:', error);
      if (userContext.setError && typeof userContext.setError === 'function') {
        userContext.setError(error.message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, userContext]);

  // 防抖刷新
  const debouncedRefresh = useCallback(
    debounce(forceRefresh, 1000),
    [forceRefresh]
  );

  // 购买VIP卡
  const purchaseVipCard = async (type) => {
    try {
      if (userContext.setLoading && typeof userContext.setLoading === 'function') {
        userContext.setLoading(true);
      }
      
      console.log('🛒 开始购买VIP卡:', type);
      const result = await vipService.purchaseVipCard(type);
      
      // 立即刷新数据
      await forceRefresh();
      
      return result;
    } catch (error) {
      console.error('❌ 购买VIP卡失败:', error);
      if (userContext.setError && typeof userContext.setError === 'function') {
        userContext.setError(error.message);
      }
      throw error;
    } finally {
      if (userContext.setLoading && typeof userContext.setLoading === 'function') {
        userContext.setLoading(false);
      }
    }
  };

  // 领取每日星源币
  const claimDailyStarcoin = async () => {
    try {
      if (userContext.setLoading && typeof userContext.setLoading === 'function') {
        userContext.setLoading(true);
      }
      
      console.log('💰 开始领取每日星源币');
      const result = await vipService.claimDailyStarcoin();
      
      // 立即刷新数据
      await forceRefresh();
      
      return result;
    } catch (error) {
      console.error('❌ 领取星源币失败:', error);
      if (userContext.setError && typeof userContext.setError === 'function') {
        userContext.setError(error.message);
      }
      throw error;
    } finally {
      if (userContext.setLoading && typeof userContext.setLoading === 'function') {
        userContext.setLoading(false);
      }
    }
  };

  // 初始化时刷新数据
  useEffect(() => {
    if (userContext.user && !lastSyncTime) {
      forceRefresh();
    }
  }, [userContext.user?.id, lastSyncTime]);

  return {
    ...userContext,
    refreshing,
    refreshUserData: debouncedRefresh,
    forceRefresh,
    purchaseVipCard,
    claimDailyStarcoin
  };
};

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
