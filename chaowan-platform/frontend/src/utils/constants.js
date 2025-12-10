// src/utils/constants.js

// 应用常量
export const APP_CONSTANTS = {
  APP_NAME: '娃娃养成平台',
  VERSION: 'V7.4.1',
  // 🔧 强制硬编码：确保始终使用正确的后端域名
  API_BASE_URL: 'https://tianchuang.onrender.com',
  
  // 本地存储键名
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    POINTS: 'userPoints',
    CASH: 'userCashBalance',
    DOLLS: 'userDolls',
    POINTS_HISTORY: 'pointsHistory',
    CASH_HISTORY: 'cashHistory'
  },
  
  // 分页设置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  
  // 文件上传限制
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
  }
};

// 娃娃相关常量
export const DOLL_CONSTANTS = {
  // 娃娃等级
  LEVELS: {
    1: { name: '练气', rarity: '⭐' },
    2: { name: '筑基', rarity: '⭐⭐' },
    3: { name: '结丹', rarity: '⭐⭐⭐' },
    4: { name: '元婴', rarity: '⭐⭐⭐⭐' },
    5: { name: '化神', rarity: '⭐⭐⭐⭐⭐' }
  },
  
  // 娃娃状态
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    EXPIRED: 'expired'
  },
  
  // 回收比例
  RECYCLE_RATE: 0.5
};

// 用户等级常量
export const USER_LEVELS = {
  1: { name: '练气', requiredExp: 0, outputBonus: 0, checkinBonus: 0 },
  2: { name: '筑基', requiredExp: 5000, outputBonus: 0.1, checkinBonus: 0 },
  3: { name: '结丹', requiredExp: 20000, outputBonus: 0.2, checkinBonus: 1 },
  4: { name: '元婴', requiredExp: 50000, outputBonus: 0.5, checkinBonus: 1.5 },
  5: { name: '化神', requiredExp: 100000, outputBonus: 0.8, checkinBonus: 2 },
  6: { name: '婴变', requiredExp: 500000, outputBonus: 1.2, checkinBonus: 3 },
  7: { name: '问鼎', requiredExp: 1000000, outputBonus: 1.8, checkinBonus: 5 },
  8: { name: '窥涅', requiredExp: 5000000, outputBonus: 3, checkinBonus: 8 },
  9: { name: '净涅', requiredExp: 20000000, outputBonus: 6, checkinBonus: 12 },
  10: { name: '碎涅', requiredExp: 50000000, outputBonus: 10, checkinBonus: 16 }
};

// API错误码
export const ERROR_CODES = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // 用户错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  INSUFFICIENT_CASH: 'INSUFFICIENT_CASH',
  
  // 娃娃错误
  DOLL_NOT_FOUND: 'DOLL_NOT_FOUND',
  DOLL_ALREADY_OWNED: 'DOLL_ALREADY_OWNED',
  DOLL_EXPIRED: 'DOLL_EXPIRED',
  
  // 业务错误
  PURCHASE_FAILED: 'PURCHASE_FAILED',
  RECYCLE_FAILED: 'RECYCLE_FAILED',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED'
};

// 默认配置
export const DEFAULT_CONFIG = {
  // 娃娃默认配置
  DOLL: {
    DEFAULT_DAYS: 60,
    MIN_DAYS: 1,
    MAX_DAYS: 365
  },
  
  // 积分默认配置
  POINTS: {
    DAILY_CHECKIN: 10,
    LEVEL_UP_BONUS: 50,
    REFERRAL_BONUS: 100
  },
  
  // 现金默认配置
  CASH: {
    MIN_WITHDRAW: 10,
    MAX_WITHDRAW: 10000,
    WITHDRAW_FEE: 0.02
  }
};
