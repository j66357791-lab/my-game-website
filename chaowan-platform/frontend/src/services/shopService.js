// src/services/shopService.js
import { api } from '../config/api';

export const shopService = {
  // 获取商城娃娃列表
  getShopDolls: async () => {
    try {
      const response = await api.get('/shop/dolls');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取商城商品列表
  getShopProducts: async () => {
    try {
      const response = await api.get('/shop/products');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 购买商城娃娃
  buyDoll: async (dollId, token) => {
    try {
      const response = await api.post('/shop/buy-doll', 
        { dollId }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取推荐娃娃
  getFeaturedDolls: async () => {
    try {
      const response = await api.get('/shop/featured');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
