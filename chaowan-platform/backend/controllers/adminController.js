const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
// 🔧 新增引入
const MysteryCardControl = require('../models/MysteryCardControl');
const MysteryCardGame = require('../models/MysteryCardGame');

// 获取所有用户（分页）
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        const searchQuery = search ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const users = await User.find(searchQuery)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(searchQuery);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
};

// 🔧 新增：更新用户信息
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, level, points, cashBalance, role, disabled } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 更新用户信息
        if (username) user.username = username;
        if (email) user.email = email;
        if (level !== undefined) user.level = level;
        if (points !== undefined) user.points = points;
        if (cashBalance !== undefined) user.cashBalance = cashBalance;
        if (role !== undefined) user.role = role;
        if (disabled !== undefined) user.disabled = disabled;

        await user.save();

        res.json({
            success: true,
            message: '用户信息更新成功',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '更新用户信息失败' });
    }
};

// 🔧 新增：修改用户密码
const updateUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: '密码长度不能少于6位' 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 这里应该加密密码，简化处理
        user.password = newPassword; 
        await user.save();

        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '修改密码失败' });
    }
};

// 🔧 新增：切换用户状态
const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        user.disabled = !user.disabled;
        await user.save();

        res.json({
            success: true,
            message: `用户已${user.disabled ? '禁用' : '启用'}`,
            data: { disabled: user.disabled }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '操作失败' });
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
        user.points = Math.max(0, user.points + amount);
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

// 🔧 新增：调整用户余额
const adjustUserCash = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        const oldCash = user.cashBalance;
        user.cashBalance = Math.max(0, user.cashBalance + amount);
        await user.save();

        // 记录交易
        await Transaction.create({
            userId,
            type: amount > 0 ? 'admin_cash_add' : 'admin_cash_deduct',
            amount: Math.abs(amount),
            description: description || `管理员${amount > 0 ? '增加' : '扣除'}现金`,
            balance: user.cashBalance
        });

        res.json({
            success: true,
            message: '余额调整成功',
            data: { oldCash, newCash: user.cashBalance }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '余额调整失败' });
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
        
        // 🔧 新增：提现相关统计
        const totalWithdrawals = await Withdrawal.countDocuments();
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
        const todayWithdrawals = await Withdrawal.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalTransactions,
                todayTransactions,
                totalWithdrawals,
                pendingWithdrawals,
                todayWithdrawals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取仪表盘数据失败' });
    }
};

// ==================== 神秘卡牌控制相关 ====================

// 🔧 获取神秘卡牌配置
const getMysteryCardConfig = async (req, res) => {
    try {
        let config = await MysteryCardControl.findOne();
        if (!config) config = await MysteryCardControl.create({});
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取配置失败' });
    }
};

// 🔧 更新神秘卡牌配置
const updateMysteryCardConfig = async (req, res) => {
    try {
        let config = await MysteryCardControl.findOne();
        if (!config) config = new MysteryCardControl();
        
        config.mode = req.body.mode || 'RANDOM';
        if (config.mode === 'FIXED') {
            config.fixedLordValue = req.body.fixedLordValue || 5;
        }
        
        await config.save();
        res.json({ success: true, message: '配置更新成功，下一局生效', data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: '更新配置失败' });
    }
};

// 🔧 获取神秘卡牌财务与历史统计
const getMysteryCardStats = async (req, res) => {
    try {
        const { date } = req.query; 
        const startDate = date ? new Date(date) : new Date(new Date().setHours(0,0,0,0));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        // 1. 聚合查询财务
        const stats = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lt: endDate },
                    type: { $in: ['mystery_bet', 'mystery_win'] }
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        let betTotal = 0; 
        let winTotal = 0; 

        stats.forEach(item => {
            if (item._id === 'mystery_bet') betTotal = Math.abs(item.total);
            if (item._id === 'mystery_win') winTotal = item.total;
        });

        // 2. 获取历史曲线图数据 (最近20局)
        const history = await MysteryCardGame
            .find()
            .sort({ roundNumber: -1 })
            .limit(20)
            .sort({ roundNumber: 1 }); 

        res.json({
            success: true,
            data: {
                totalFlow: betTotal, 
                payout: winTotal,   
                income: betTotal - winTotal, 
                history 
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: '获取统计失败' });
    }
};

module.exports = {
    getAllUsers,
    updateUser,
    updateUserPassword,
    toggleUserStatus,
    adjustUserPoints,
    adjustUserCash,
    deleteUser,
    getDashboardData,
    getMysteryCardConfig,
    updateMysteryCardConfig,
    getMysteryCardStats
};
