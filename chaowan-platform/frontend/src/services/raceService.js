// frontend/src/services/raceService.js - 修复版本
import api from '../config/api';

// 开始龟兔赛跑
export const startRace = async (betData) => {
  try {
    console.log('🚀 发送游戏请求:', betData);
    const response = await api.post('/race/start', betData);
    console.log('✅ 游戏请求成功:', response);
    return response;
  } catch (error) {
    console.error('❌ 游戏请求失败:', error);
    throw error;
  }
};

// 获取用户赛跑历史
export const getRaceHistory = async (params = {}) => {
  try {
    console.log('📜 获取用户历史请求:', params);
    const response = await api.get(`/race/history?${new URLSearchParams(params).toString()}`);
    console.log('✅ 获取用户历史成功:', response);
    return response;
  } catch (error) {
    console.error('❌ 获取用户历史失败:', error);
    throw error;
  }
};

// 获取最近赛跑结果
export const getRecentRaces = async () => {
  try {
    console.log('📜 获取最近结果请求');
    const response = await api.get('/race/recent');
    console.log('✅ 获取最近结果成功:', response);
    return response;
  } catch (error) {
    console.error('❌ 获取最近结果失败:', error);
    throw error;
  }
};
