// backend/controllers/categoryController.js
const Category = require('../models/Category');

// 获取所有分类（包含父子级结构）
const getCategories = async (req, res) => {
  try {
    // 查找所有分类，按创建时间排序
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getCategories
};
