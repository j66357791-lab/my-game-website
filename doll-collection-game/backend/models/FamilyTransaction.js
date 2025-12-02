const mongoose = require('mongoose');

const familyTransactionSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chickenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chicken'
    },
    feedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feed'
    },
    eggId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Egg'
    },
    type: {
        type: String,
        enum: [
            'feed_purchase', 
            'egg_exchange', 
            'chicken_draw', 
            'coop_upgrade',
            'egg_pool_release',
            'lifespan_adjustment',
            'cooperative_invite'
        ],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    // 新增：交易详情
    details: {
        growthValue: Number,
        eggCount: Number,
        pointsSpent: Number,
        pointsReceived: Number,
        feedType: {
            type: String,
            enum: ['normal', 'cooperative', 'special'],
            default: 'normal'
        },
        coopType: {
            type: String,
            enum: ['individual', 'cooperative', 'pool'],
            default: 'individual'
        }
    },
    // 新增：关联信息
    relatedUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'feeder', 'collector', 'contributor'],
            default: 'contributor'
        },
        contribution: {
            type: Number,
            default: 0
        }
    }],
    // 新增：交易状态
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed'
    },
    // 新增：交易元数据
    metadata: {
        ip: String,
        userAgent: String,
        sessionId: String,
        source: {
            type: String,
            enum: ['web', 'mobile', 'api'],
            default: 'web'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 索引
familyTransactionSchema.index({ familyId: 1, createdAt: -1 });
familyTransactionSchema.index({ userId: 1, createdAt: -1 });
familyTransactionSchema.index({ chickenId: 1, createdAt: -1 });
familyTransactionSchema.index({ type: 1, createdAt: -1 });
familyTransactionSchema.index({ status: 1 });

// 实例方法
familyTransactionSchema.methods.addRelatedUser = function(userId, role = 'contributor', contribution = 0) {
    const existingUser = this.relatedUsers.find(
        user => user.userId.toString() === userId.toString()
    );
    
    if (existingUser) {
        existingUser.contribution += contribution;
    } else {
        this.relatedUsers.push({
            userId,
            role,
            contribution
        });
    }
    
    return this.save();
};

familyTransactionSchema.methods.updateStatus = function(status) {
    this.status = status;
    this.updatedAt = new Date();
    return this.save();
};

// 静态方法
familyTransactionSchema.statics.getFamilyTransactions = async function(familyId, options = {}) {
    const {
        type,
        userId,
        chickenId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = options;
    
    let query = { familyId };
    
    if (type) query.type = type;
    if (userId) query.userId = userId;
    if (chickenId) query.chickenId = chickenId;
    if (status) query.status = status;
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await this.find(query)
        .populate('userId', 'username email')
        .populate('chickenId', 'name level quality')
        .populate('feedId', 'name price')
        .populate('eggId', 'quantity quality')
        .populate('relatedUsers.userId', 'username')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
    
    const total = await this.countDocuments(query);
    
    return {
        transactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

familyTransactionSchema.statics.getUserTransactionStats = async function(userId, familyId = null) {
    let matchQuery = { userId };
    
    if (familyId) {
        matchQuery.familyId = familyId;
    }
    
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                avgAmount: { $avg: '$amount' },
                firstTransaction: { $min: '$createdAt' },
                lastTransaction: { $max: '$createdAt' }
            }
        },
        {
            $sort: { totalAmount: -1 }
        }
    ]);
    
    return stats;
};

familyTransactionSchema.statics.getChickenTransactionStats = async function(chickenId) {
    const stats = await this.aggregate([
        { $match: { chickenId } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalGrowthValue: { $sum: '$details.growthValue' },
                totalEggCount: { $sum: '$details.eggCount' },
                totalPointsSpent: { $sum: '$details.pointsSpent' },
                totalPointsReceived: { $sum: '$details.pointsReceived' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
    
    return stats;
};

familyTransactionSchema.statics.getFeedTransactionStats = async function(familyId, dateRange = null) {
    let matchQuery = { 
        familyId,
        type: 'feed_purchase'
    };
    
    if (dateRange) {
        const { startDate, endDate } = dateRange;
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                totalFeeds: { $sum: 1 },
                totalPointsSpent: { $sum: '$details.pointsSpent' },
                totalGrowthValue: { $sum: '$details.growthValue' },
                uniqueUsers: { $addToSet: '$userId' },
                feedTypes: { $push: '$details.feedType' }
            }
        },
        {
            $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
        }
    ]);
    
    return stats.map(stat => ({
        ...stat,
        uniqueUserCount: stat.uniqueUsers.length,
        feedTypeDistribution: this.getFeedTypeDistribution(stat.feedTypes)
    }));
};

familyTransactionSchema.statics.getFeedTypeDistribution = function(feedTypes) {
    const distribution = {};
    feedTypes.forEach(type => {
        distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
};

familyTransactionSchema.statics.createCooperativeTransaction = async function(data) {
    const {
        familyId,
        userId,
        chickenId,
        feedId,
        type,
        amount,
        description,
        details,
        relatedUsers
    } = data;
    
    const transaction = new this({
        familyId,
        userId,
        chickenId,
        feedId,
        type: type || 'feed_purchase',
        amount: amount || 0,
        description: description || '',
        details: {
            ...details,
            feedType: 'cooperative',
            coopType: 'cooperative'
        },
        relatedUsers: relatedUsers || [],
        status: 'completed'
    });
    
    await transaction.save();
    return transaction;
};

module.exports = mongoose.model('FamilyTransaction', familyTransactionSchema);
