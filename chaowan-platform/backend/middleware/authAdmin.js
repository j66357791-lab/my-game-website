// backend/middleware/authAdmin.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    // 1. 从header获取token
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: '没有token，认证失败' });
    }

    try {
        // 2. 解码token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // 确保你的.env里有JWT_SECRET

        // 3. 根据解码出的id查找用户
        const user = await User.findById(decoded.user.id).select('-password');

        // 4. 检查用户是否存在以及角色是否为admin
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ msg: '权限不足，仅限管理员访问' });
        }

        // 5. 将用户信息添加到请求对象，供后续路由使用
        req.user = user;
        next();

    } catch (err) {
        res.status(401).json({ msg: 'Token无效' });
    }
};
