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

  // 防抖刷新 - 5秒内只执行一次
  const debouncedRefresh = useCallback(
    debounce(async () => {
      if (refreshing) return;
      
      setRefreshing(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 添加版本控制
        const currentVersion = Date.now();
        
        const [userData, dollsData, vipData, bossData] = await Promise.all([
          userService.getUserData(token),
          dollService.getMyDolls(token),
          vipService.getVipStatus(token),
          bossService.getBossStatus(token)
        ]);

        // 检查数据版本，避免旧数据覆盖新数据
        if (currentVersion > lastSyncTime) {
          dataSync.syncUserData({
            user: userData.user,
            points: userData.points,
            cashBalance: userData.cashBalance,
            starcoin: userData.user.starcoin, // 添加星源币
            dolls: dollsData.dolls,
            vipStatus: vipData.data,
            bossStatus: bossData.data,
            version: currentVersion
          }, userContext);
          
          setLastSyncTime(currentVersion);
        }
      } catch (error) {
        console.error('刷新用户数据失败:', error);
        userContext.setError(error.message);
      } finally {
        setRefreshing(false);
      }
    }, 5000),
    [refreshing, lastSyncTime, userContext]
  );

  // 购买VIP卡
  const purchaseVipCard = async (type) => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await vipService.purchaseVipCard(type, token);
      
      // 立即刷新数据
      await debouncedRefresh();
      
      return result;
    } catch (error) {
      console.error('购买VIP卡失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 领取每日星源币
  const claimDailyStarcoin = async () => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await vipService.claimDailyStarcoin(token);
      
      // 立即刷新数据
      await debouncedRefresh();
      
      return result;
    } catch (error) {
      console.error('领取星源币失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 攻击Boss
  const attackBoss = async (bossId, damage) => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      const result = await bossService.attackBoss(bossId, damage, token);
      
      // 立即刷新数据
      await debouncedRefresh();
      
      return result;
    } catch (error) {
      console.error('攻击Boss失败:', error);
      userContext.setError(error.message);
      throw error;
    } finally {
      userContext.setLoading(false);
    }
  };

  // 只在真正需要时初始化
  useEffect(() => {
    if (userContext.user && !lastSyncTime) {
      debouncedRefresh();
    }
  }, [userContext.user?.id]);

  return {
    ...userContext,
    refreshing,
    refreshUserData: debouncedRefresh,
    purchaseVipCard,
    claimDailyStarcoin,
    attackBoss
  };
};
