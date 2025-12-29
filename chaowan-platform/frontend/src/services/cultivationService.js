import api from '../config/api';

export const cultivationService = {
  getData: () => api.get('/cultivation/data'),
  allocatePoint: (attr) => api.post('/cultivation/allocate', { attr }),
  claim: () => api.post('/cultivation/claim'),
  breakthrough: (pill) => api.post('/cultivation/breakthrough', { usePillQuality: pill }),
  // ...装备相关接口
};
