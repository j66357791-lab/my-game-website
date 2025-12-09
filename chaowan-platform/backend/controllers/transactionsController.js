// backend/controllers/transactionsController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// 获取现金交易记录
exports.getCashTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    
    // 只查询现金相关的交易类型
    const filter = { 
      userId,
      type: 'blindbox_reward' // 盲盒奖励是现金收入
    };
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('获取现金交易记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取所有交易记录（管理员用）
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, userId } = req.query;
    
    // 构建筛选条件
    const filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (userId) {
      filter.userId = userId;
    }
    
    const transactions = await Transaction.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('获取所有交易记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
