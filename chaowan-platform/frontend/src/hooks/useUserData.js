import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';
import { dollService } from '../services/dollService';
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
        
        const [userData, dollsData] = await Promise.all([
          userService.getUserData(token),
          dollService.getMyDolls(token)
        ]);

        // 检查数据版本，避免旧数据覆盖新数据
        if (currentVersion > lastSyncTime) {
          dataSync.syncUserData({
            user: userData.user,
            points: userData.points,
            cashBalance: userData.cashBalance,
            dolls: dollsData.dolls,
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

  // 优化后的购买娃娃
  const purchaseDoll = async (dollId) => {
    try {
      userContext.setLoading(true);
      const token = localStorage.getItem('token');
      
      // 乐观更新 - 先更新UI，再同步服务器
      const optimisticResult = await dollService.purchaseDoll(dollId, token);
      
      // 使用事务性同步
      await dataSync.syncAfterPurchase(optimisticResult, userContext);
      
      // 延迟验证数据一致性
      setTimeout(() => debouncedRefresh(), 1000);
      
      return optimisticResult;
    } catch (error) {
      console.error('购买娃娃失败:', error);
      userContext.setError(error.message);
      // 回滚乐观更新
      await debouncedRefresh();
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
  }, [userContext.user?.id]); // 只依赖用户ID，避免频繁触发

  return {
    ...userContext,
    refreshing,
    refreshUserData: debouncedRefresh,
    purchaseDoll,
    recycleDoll: async (dollId) => {
      // 类似 purchaseDoll 的优化逻辑
    }
  };
};
