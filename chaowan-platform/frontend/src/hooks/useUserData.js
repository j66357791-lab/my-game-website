// frontend/src/hooks/useUserData.js - 修复函数错误
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
      
      console.log('🔄 开始刷新用户数据...');
      
      // 并行获取所有数据，但处理可能的错误
      const promises = [
        userService.getUserData().catch(err => {
          console.error('获取用户数据失败:', err);
          return { user: { points: 0, starcoin: 0, cashBalance: 0 } };
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
      
      const userData = results[0].status === 'fulfilled' ? results[0].value : { user: { points: 0, starcoin: 0, cashBalance: 0 } };
      const dollsData = results[1].status === 'fulfilled' ? results[1].value : { dolls: [] };
      const vipData = results[2].status === 'fulfilled' ? results[2].value : { data: {} };
      const bossData = results[3].status === 'fulfilled' ? results[3].value : { data: {} };

      // 统一数据格式
      const syncData = {
        user: userData.user,
        points: userData.user?.points || 0,
        starcoin: userData.user?.starcoin || 0,
        cashBalance: userData.user?.cashBalance || 0,
        dolls: dollsData.dolls || [],
        vipStatus: vipData.data || {},
        bossStatus: bossData.data || {},
        version: currentVersion
      };

      console.log('📊 同步数据:', syncData);
      
      // 🔧 修复：检查userContext.updateAllData是否存在
      if (userContext.updateAllData && typeof userContext.updateAllData === 'function') {
        userContext.updateAllData(syncData);
      } else {
        console.error('❌ userContext.updateAllData 不是函数');
      }
      
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
  }, [userContext.user?.id]);

  return {
    ...userContext,
    refreshing,
    refreshUserData: debouncedRefresh,
    forceRefresh,
    purchaseVipCard,
    claimDailyStarcoin
  };
};
