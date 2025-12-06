const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 获取所有用户（分页）
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
};

// 调整用户积分
const adjustUserPoints = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        const oldPoints = user.points;
        user.points += amount;
        await user.save();

        // 记录交易
        await Transaction.create({
            userId,
            type: amount > 0 ? 'admin_add' : 'admin_deduct',
            amount: Math.abs(amount),
            description: description || `管理员${amount > 0 ? '增加' : '扣除'}积分`,
            balance: user.points
        });

        res.json({
            success: true,
            message: '积分调整成功',
            data: { oldPoints, newPoints: user.points }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '积分调整失败' });
    }
};

// 删除用户
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        res.json({ success: true, message: '用户删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '删除用户失败' });
    }
};

// 获取仪表盘数据
const getDashboardData = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        const todayTransactions = await Transaction.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalTransactions,
                todayTransactions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取仪表盘数据失败' });
    }
};

module.exports = {
    getAllUsers,
    adjustUserPoints,
    deleteUser,
    getDashboardData
};
