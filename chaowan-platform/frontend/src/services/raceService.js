// frontend/src/services/raceService.js
import api from '../config/api';

// 开始龟兔赛跑
export const startRace = async (betData) => {
  try {
    const response = await api.post('/race/start', betData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: '游戏失败' };
  }
};

// 获取用户赛跑历史
export const getRaceHistory = async (params = {}) => {
  try {
    const response = await api.get('/race/history', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: '获取历史失败' };
  }
};

// 获取最近赛跑结果
export const getRecentRaces = async () => {
  try {
    const response = await api.get('/race/recent');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: '获取最近结果失败' };
  }
};
