// frontend/src/services/authService.js
import { api } from '../config/api';

// 用户注册
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response;
  } catch (error) {
    throw error;
  }
};

// 用户登录
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response;
  } catch (error) {
    throw error;
  }
};

// 获取用户信息
export const getUser = async (token) => {
  try {
    const response = await api.getUser(token);
    return response;
  } catch (error) {
    throw error;
  }
};

// 保存token到localStorage
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

// 获取保存的token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 清除token
export const clearToken = () => {
  localStorage.removeItem('token');
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
