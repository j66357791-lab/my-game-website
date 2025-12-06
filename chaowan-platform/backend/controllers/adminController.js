// backend/controllers/adminController.js

const User = require('../models/User');
const Doll = require('../models/Doll'); // 假设你有Doll模型
const Transaction = require('../models/Transaction'); // 假设你有Transaction模型

// @desc   获取所有用户列表
// @route  GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // 不返回密码
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('服务器错误');
    }
};

// @desc   修改用户积分
// @route  PUT /api/admin/users/:userId/points
exports.updateUserPoints = async (req, res) => {
    const { points } = req.body;
    try {
        let user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: '用户未找到' });
        }

        // (可选) 记录积分变动交易，这是一个好习惯
        const newTransaction = new Transaction({
            user: user._id,
            type: 'admin_adjustment',
            amount: points - user.points,
            description: `管理员 ${req.user.username} 调整积分`
        });
        await newTransaction.save();

        user.points = points;
        await user.save();

        res.json({ msg: '用户积分已更新', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('服务器错误');
    }
};

// @desc   获取指定用户的娃娃
// @route  GET /api/admin/users/:userId/dolls
exports.getUserDolls = async (req, res) => {
    try {
        // 假设Doll模型里有owner字段关联User的_id
        const dolls = await Doll.find({ owner: req.params.userId });
        res.json(dolls);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('服务器错误');
    }
};
