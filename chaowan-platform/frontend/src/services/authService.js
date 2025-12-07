// src/services/authService.js
import { api } from '../config/api';
import { APP_CONSTANTS } from '../utils/constants';

// 用户注册
export const register = async (userData) => {
  try {
    const response = await api.register(userData.username, userData.email, userData.password);
    return response;
  } catch (error) {
    throw error;
  }
};

// 用户登录
export const login = async (credentials) => {
  try {
    const response = await api.login(credentials.email, credentials.password);
    return response;
  } catch (error) {
    throw error;
  }
};

// 保存token到localStorage
export const saveToken = (token) => {
  localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.TOKEN, token);
};

// 获取保存的token
export const getToken = () => {
  return localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.TOKEN);
};

// 清除token
export const clearToken = () => {
  localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.TOKEN);
};

// 验证token有效性
export const validateToken = async (token) => {
  try {
    const response = await api.getUser(token);
    return response.success;
  } catch (error) {
    return false;
  }
};
