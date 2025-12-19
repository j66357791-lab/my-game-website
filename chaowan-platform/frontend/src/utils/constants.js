// frontend/src/utils/constants.js - 完整版本
export const APP_CONSTANTS = {
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    POINTS: 'points',
    STARCOIN: 'starcoin', // 添加星源币存储键
    CASH: 'cashBalance',
    DOLLS: 'dolls'
  },
  API_ENDPOINTS: {
    BASE_URL: 'https://tianchuang.onrender.com/api',
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      USER: '/auth/user'
    },
    VIP: {
      STATUS: '/vip-cards/status',
      PURCHASE: '/vip-cards/purchase',
      CLAIM: '/vip-cards/claim-daily-starcoin'
    },
    BOSS: {
      STATUS: '/boss/status',
      CHALLENGE: '/boss/challenge',
      ATTACK: '/boss/attack'
    },
    DOLLS: {
      MY: '/dolls/user-dolls',
      PURCHASE: '/dolls/purchase',
      RECYCLE: '/dolls/recycle'
    }
  }
};
