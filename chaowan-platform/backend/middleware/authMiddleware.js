// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);

    // 🔐 验证 token（要求必须设置环境变量）
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    if (user.disabled) {
      return res.status(403).json({ success: false, message: '账号已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: '无效的令牌' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期' });
    }
    
    res.status(500).json({ success: false, message: '认证失败' });
  }
};

module.exports = authMiddleware;
