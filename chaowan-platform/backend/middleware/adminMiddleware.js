// backend/middleware/adminMiddleware.js
const authMiddleware = require('./authMiddleware');

const adminMiddleware = async (req, res, next) => {
  authMiddleware(req, res, () => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
      }
      req.adminUser = req.user; // 兼容旧代码
      next();
    } catch (error) {
      console.error('管理员权限验证错误:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  });
};

module.exports = adminMiddleware;
