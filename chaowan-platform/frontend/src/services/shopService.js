// frontend/src/services/shopService.js
import { api } from '../config/api';

export const shopService = {
  // 获取分类列表
  getCategories: async () => {
    try {
      const res = await api.get('/shop/categories'); // 注意：如果有分类路由的话，或者硬编码
      // 目前后端分类路由在 /api/admin/shop/categories，前台可能需要单独开放或者复用
      // 暂时我们先假设有一个公开的分类接口，或者我们通过硬编码过滤
      return res.data; 
    } catch (error) {
      // 如果没有公开接口，返回默认分类，前端硬编码
      return [
        { id: 'newbie_special', name: '新人特惠' },
        { id: 'flash_sale', name: '限时抢购' },
        { id: 'clearance', name: '低价清仓' },
        { id: 'all', name: '全部商品' },
        { id: 'virtual', name: '虚拟商品' },
        { id: 'physical', name: '实物商品' }
      ];
    }
  },

  // 获取商品列表（支持 tag 和 categorySlug 筛选）
  getProducts: async (params = {}) => {
    const { tag, categorySlug, page = 1 } = params;
    try {
      let query = `?page=${page}`;
      if (tag && tag !== 'all') query += `&tag=${tag}`;
      if (categorySlug) query += `&categorySlug=${categorySlug}`;
      
      const res = await api.get(`/shop/products${query}`);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取商品详情
  getProductDetail: async (id) => {
    try {
      const res = await api.get(`/shop/products/${id}`);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  // 创建订单（支持混合支付）
  createOrder: async (orderData) => {
    try {
      const res = await api.post('/shop/orders', orderData);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取我的订单
  getMyOrders: async () => {
    try {
      const res = await api.get('/shop/orders');
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  // 确认收货
  confirmReceive: async (orderId) => {
    try {
      const res = await api.put(`/shop/orders/${orderId}/receive`);
      return res.data;
    } catch (error) {
      throw error;
    }
  }
};
