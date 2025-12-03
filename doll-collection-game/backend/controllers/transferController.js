// controllers/transferController.js
const User = require('../models/User');
const Transfer = require('../models/Transfer');
const Transaction = require('../models/Transaction');

exports.processTransfer = async (req, res) => {
    try {
        const { toUserId, amount, description } = req.body;
        const fromUserId = req.user._id;

        // 验证数据
        if (!toUserId || !amount || amount <= 0) {
            return res.status(400).json({ message: '参数错误' });
        }

        // 检查积分是否足够
        if (req.user.points < amount) {
            return res.status(400).json({ message: '积分不足' });
        }

        // 检查是否为自己转账
        if (toUserId === fromUserId.toString()) {
            return res.status(400).json({ message: '不能给自己转账' });
        }

        // 查找目标用户
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            return res.status(404).json({ message: '收款用户不存在' });
        }

        // 执行转账（这里应该使用数据库事务）
        req.user.points -= amount;
        toUser.points += amount;

        await req.user.save();
        await toUser.save();

        // 创建转账记录
        const transfer = new Transfer({
            fromUserId,
            toUserId,
            amount,
            description: description || '积分转账'
        });
        await transfer.save();

        // 创建交易记录
        await new Transaction({
            userId: fromUserId,
            type: 'transfer_out',
            amount: -amount,
            description: `转账给${toUser.username}: ${description || '积分转账'}`
        }).save();

        await new Transaction({
            userId: toUserId,
            type: 'transfer_in', 
            amount: amount,
            description: `收到${req.user.username}转账: ${description || '积分转账'}`
        }).save();

        res.json({ 
            message: '转账成功',
            user: { points: req.user.points }
        });

    } catch (error) {
        console.error('转账错误:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
};
