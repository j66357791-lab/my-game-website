// src/services/gameService.js
import api from '../config/api';  // 🔧 修复路径

export default {
  getCurrentGame: () => api.get('/game/current'),
  placeBet: (data) => api.post('/game/bet', data),
  getHistory: (params) => api.get('/game/history', { params }),
  getStats: () => api.get('/game/stats')
};
