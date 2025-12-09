// backend/controllers/pointsController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// 获取用户积分历史
exports.getPointsHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type } = req.query;
    
    // 构建筛选条件
    const filter = { userId };
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    // 只查询积分相关的交易类型
    filter.type = {
      $in: [
        'checkin', 'purchase', 'production', 'recycle', 
        'register', 'level_up', 'admin_add', 'admin_deduct',
        'blindbox_draw', 'blindbox_reward', 'refining_claim'
      ]
    };
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        history: transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('获取积分历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取积分统计
exports.getPointsStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 获取用户当前积分
    const user = await User.findById(userId);
    
    // 统计积分收入和支出
    const stats = await Transaction.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] }
          },
          totalSpent: {
            $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] }
          }
        }
      }
    ]);
    
    const result = stats[0] || { totalEarned: 0, totalSpent: 0 };
    
    res.json({
      success: true,
      data: {
        currentBalance: user.points,
        totalEarned: result.totalEarned,
        totalSpent: result.totalSpent
      }
    });
  } catch (error) {
    console.error('获取积分统计失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
