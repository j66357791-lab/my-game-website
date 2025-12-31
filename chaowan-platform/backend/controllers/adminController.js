// backend/controllers/adminController.js - 完整修复版
const mongoose = require('mongoose'); // 引入 mongoose 以获取动态定义的 Checkin 模型
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const MysteryCardGame = require('../models/MysteryCardGame');

// ==================== 用户管理 ====================

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

// 更新用户信息
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, email, level, points, cashBalance, role, disabled, starcoin } = req.body;
        
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
        if (role) user.role = role;
        if (disabled !== undefined) user.disabled = disabled;
        if (starcoin !== undefined) user.starcoin = starcoin;

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

// 修改用户密码
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

        // 直接赋值，模型的 pre('save') 钩子会自动加密
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

// 切换用户状态
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

// 删除用户
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 级联删除相关数据
        const Checkin = mongoose.model('Checkin'); // ✅ 修正：使用 mongoose.model 获取动态定义的 Checkin 模型
        const Doll = require('../models/Doll');
        const BlindBoxActivity = require('../models/BlindBoxActivity');
        const BlindBoxReward = require('../models/BlindBoxReward');

        await Checkin.deleteMany({ userId });
        await Transaction.deleteMany({ userId });
        await Withdrawal.deleteMany({ userId });
        await Doll.deleteMany({ userId });
        await BlindBoxActivity.deleteMany({ userId });
        await BlindBoxReward.deleteMany({ userId });

        res.json({ success: true, message: '用户删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: '删除用户失败' });
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

// 调整用户余额
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

// ==================== 仪表盘 ====================

// 获取仪表盘数据
const getDashboardData = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        const todayTransactions = await Transaction.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        
        // 提现相关统计
        const totalWithdrawals = await Withdrawal.countDocuments();
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
        const todayWithdrawals = await Withdrawal.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        
        // 神秘卡牌统计
        const totalMysteryCardGames = await MysteryCardGame.countDocuments();
        const todayMysteryCardGames = await MysteryCardGame.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        const totalPointsInSystem = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);
        
        const todayRevenue = await Transaction.aggregate([
            {
                $match: {
                    type: 'purchase',
                    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                }
            },
            { $group: { _id: null, total: {$sum: { $abs: "$amount" } } } }
        ]);

        const recentTransactions = await Transaction.find()
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalTransactions,
                    todayTransactions,
                    totalWithdrawals,
                    pendingWithdrawals,
                    todayWithdrawals,
                    totalMysteryCardGames,
                    todayMysteryCardGames,
                    totalPointsInSystem: totalPointsInSystem[0]?.total || 0,
                    todayRevenue: todayRevenue[0]?.total || 0
                },
                recentTransactions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取仪表盘数据失败' });
    }
};

// ==================== 神秘卡牌配置管理 ====================

// 获取神秘卡牌游戏配置
const getMysteryCardConfig = async (req, res) => {
    try {
        // 这里可以返回硬编码的配置，或者从数据库读取
        // 由于没有单独的 Config 模型，这里返回默认配置或最新游戏记录作为参考
        const latestGame = await MysteryCardGame.findOne().sort({ roundNumber: -1 });

        res.json({
            success: true,
            data: {
                enabled: true,
                minBet: 1,
                maxBet: 1000,
                lordCardRewardMultiplier: 2.0,
                latestRound: latestGame ? latestGame.roundNumber : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取配置失败' });
    }
};

// 更新神秘卡牌游戏配置
const updateMysteryCardConfig = async (req, res) => {
    try {
        const { enabled, minBet, maxBet, lordCardRewardMultiplier } = req.body;
        
        // 这里通常应该保存到配置表，如果没有，可以仅返回成功（模拟）
        // 或者将配置写入 process.env / 环境变量
        
        console.log(`🔧 更新神秘卡牌配置:`, req.body);
        
        res.json({
            success: true,
            message: '配置已更新',
            data: {
                enabled: enabled !== undefined ? enabled : true,
                minBet: minBet || 1,
                maxBet: maxBet || 1000,
                lordCardRewardMultiplier: lordCardRewardMultiplier || 2.0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '更新配置失败' });
    }
};

// 获取神秘卡牌统计数据
const getMysteryCardStats = async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let startDate;
        switch (period) {
            case '1d':
                startDate = new Date(new Date().setHours(0, 0, 0, 0));
                break;
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 0);
        }

        const stats = await MysteryCardGame.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    totalBets: { $sum: '$totalBets' },
                    totalWins: { $sum: '$totalWins' },
                    totalLosses: { $sum: '$totalLosses' },
                    totalProfit: { $sum: '$totalProfit' } // 假设模型里有这个字段
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                totalGames: 0,
                totalBets: 0,
                totalWins: 0,
                totalLosses: 0,
                totalProfit: 0
            },
            period
        });
    } catch (error) {
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
