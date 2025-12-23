// backend/middleware/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
  try {
    // 检查用户角色
    if (!req.user || (req.user.role !== 'admin' && req.user.email !== 'admin@example.com')) {
      return res.status(403).json({ success: false, message: '权限不足，需要管理员权限' });
    }

    next();
  } catch (error) {
    console.error('管理员权限检查错误:', error);
    res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

module.exports = adminMiddleware;
