const mongoose = require('mongoose');

const chickenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 6
    },
    quality: {
        type: String,
        enum: ['普通', '精英', '传说', '神话'],
        default: '普通'
    },
    growthValue: {
        type: Number,
        default: 0,
        min: 0
    },
    health: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    isAdult: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    // 新增：协作所有者
    cooperativeOwners: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['主要', '次要', '协助'],
            default: '次要'
        },
        contributionPoints: {
            type: Number,
            default: 0
        },
        joinDate: {
            type: Date,
            default: Date.now
        },
        lastFeedDate: {
            type: Date
        },
        feedCount: {
            type: Number,
            default: 0
        }
    }],
    // 新增：喂养限制
    dailyFeedLimit: {
        type: Number,
        default: 1
    },
    lastFeedDate: {
        type: Date
    },
    // 新增：寿命管理系统
    lifespanManagement: {
        currentLifespan: {
            type: Number,
            default: 180
        },
        maxLifespan: {
            type: Number,
            default: 365
        },
        lifespanReductions: [{
            date: {
                type: Date,
                default: Date.now
            },
            reason: {
                type: String,
                required: true
            },
            daysReduced: {
                type: Number,
                required: true
            },
            reducedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }],
        lifespanExtensions: [{
            date: {
                type: Date,
                default: Date.now
            },
            reason: {
                type: String,
                required: true
            },
            daysExtended: {
                type: Number,
                required: true
            },
            extendedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },
    remainingDays: {
        type: Number,
        default: 180
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deathDate: {
        type: Date
    }
}, {
    timestamps: true
});

// 索引
chickenSchema.index({ familyId: 1 });
chickenSchema.index({ ownerId: 1 });
chickenSchema.index({ level: 1 });
chickenSchema.index({ active: 1 });

// 实例方法
chickenSchema.methods.checkHealth = function() {
    return this.health >= 50;
};

chickenSchema.methods.canUpgrade = function() {
    const growthRequirements = {
        0: 100,
        1: 200,
        2: 500,
        3: 1250,
        4: 3125,
        5: 7813
    };
    
    const requirement = growthRequirements[this.level] || 0;
    return this.growthValue >= requirement && this.level < 6;
};

chickenSchema.methods.upgrade = function() {
    if (!this.canUpgrade()) {
        throw new Error('成长值不足或已达到最高等级');
    }
    
    this.level += 1;
    this.growthValue = 0;
    
    // 升级后检查是否成年
    if (this.level >= 3) {
        this.isAdult = true;
    }
    
    return this.level;
};

chickenSchema.methods.addCooperativeOwner = async function(userId, role = '次要') {
    // 检查用户是否已是协作所有者
    const existingOwner = this.cooperativeOwners.find(
        owner => owner.userId.toString() === userId.toString()
    );
    
    if (existingOwner) {
        throw new Error('该用户已是协作所有者');
    }
    
    // 添加协作所有者
    this.cooperativeOwners.push({
        userId,
        role,
        joinDate: new Date()
    });
    
    await this.save();
    return this.cooperativeOwners[this.cooperativeOwners.length - 1];
};

chickenSchema.methods.removeCooperativeOwner = async function(userId) {
    this.cooperativeOwners = this.cooperativeOwners.filter(
        owner => owner.userId.toString() !== userId.toString()
    );
    
    await this.save();
};

chickenSchema.methods.updateContributionPoints = async function(userId, points) {
    const owner = this.cooperativeOwners.find(
        owner => owner.userId.toString() === userId.toString()
    );
    
    if (owner) {
        owner.contributionPoints += points;
        await this.save();
    }
    
    return owner;
};

chickenSchema.methods.canBeFedBy = async function(userId) {
    // 检查是否是主人
    if (this.ownerId.toString() === userId.toString()) {
        return { canFeed: true, reason: '主人' };
    }
    
    // 检查是否是协作所有者
    const isCooperativeOwner = this.cooperativeOwners.some(
        owner => owner.userId.toString() === userId.toString()
    );
    
    if (isCooperativeOwner) {
        return { canFeed: true, reason: '协作所有者' };
    }
    
    // 检查是否在同一个家庭
    const Family = mongoose.model('Family');
    const family = await Family.findOne({
        _id: this.familyId,
        $or: [
            { ownerId: userId },
            { 'members.userId': userId }
        ]
    });
    
    if (family) {
        return { canFeed: true, reason: '家庭成员' };
    }
    
    return { canFeed: false, reason: '没有权限' };
};

chickenSchema.methods.checkDailyFeedLimit = async function(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 检查协作所有者的今日喂养次数
    const owner = this.cooperativeOwners.find(
        owner => owner.userId.toString() === userId.toString()
    );
    
    if (owner) {
        const todayFeeds = owner.feedCount || 0;
        const dailyLimit = this.dailyFeedLimit || 1;
        
        if (todayFeeds >= dailyLimit) {
            return {
                canFeed: false,
                reason: `今日喂养次数已达上限(${dailyLimit}次)`,
                remainingFeeds: 0,
                nextFeedTime: tomorrow
            };
        }
        
        return {
            canFeed: true,
            remainingFeeds: dailyLimit - todayFeeds,
            nextFeedTime: todayFeeds === 0 ? new Date() : tomorrow
        };
    }
    
    // 检查主人的今日喂养次数
    const FamilyTransaction = mongoose.model('FamilyTransaction');
    const todayFeeds = await FamilyTransaction.countDocuments({
        userId: userId,
        chickenId: this._id,
        type: 'feed_purchase',
        createdAt: {
            $gte: today,
            $lt: tomorrow
        }
    });
    
    const dailyLimit = this.dailyFeedLimit || 1;
    
    if (todayFeeds >= dailyLimit) {
        return {
            canFeed: false,
            reason: `今日喂养次数已达上限(${dailyLimit}次)`,
            remainingFeeds: 0,
            nextFeedTime: tomorrow
        };
    }
    
    return {
        canFeed: true,
        remainingFeeds: dailyLimit - todayFeeds,
        nextFeedTime: todayFeeds === 0 ? new Date() : tomorrow
    };
};

chickenSchema.methods.recordFeed = async function(userId, feedId, pointsSpent, growthValue) {
    const FamilyTransaction = mongoose.model('FamilyTransaction');
    
    // 记录喂养交易
    await FamilyTransaction.create({
        familyId: this.familyId,
        userId: userId,
        chickenId: this._id,
        feedId: feedId,
        type: 'feed_purchase',
        amount: -pointsSpent,
        description: `喂养${this.name}，获得${growthValue}成长值`
    });
    
    // 更新小鸡状态
    this.growthValue += growthValue;
    this.health = Math.min(100, this.health + 5); // 喂养增加健康
    this.lastFeedDate = new Date();
    
    // 更新协作所有者的喂养记录
    const owner = this.cooperativeOwners.find(
        owner => owner.userId.toString() === userId.toString()
    );
    
    if (owner) {
        owner.lastFeedDate = new Date();
        owner.feedCount = (owner.feedCount || 0) + 1;
        owner.contributionPoints += growthValue;
    }
    
    await this.save();
    
    // 检查是否可以升级
    if (this.canUpgrade()) {
        this.upgrade();
    }
    
    return {
        success: true,
        growthValue: this.growthValue,
        health: this.health,
        level: this.level,
        upgraded: this.canUpgrade()
    };
};

chickenSchema.methods.calculateEggProduction = function() {
    if (!this.isAdult || !this.active) {
        return 0;
    }
    
    // 基础产蛋量
    let eggCount = 1;
    
    // 根据等级调整
    if (this.level >= 4) {
        eggCount = 2;
    } else if (this.level >= 5) {
        eggCount = 3;
    } else if (this.level >= 6) {
        eggCount = 4;
    }
    
    // 根据品质调整
    const qualityMultipliers = {
        '普通': 1.0,
        '精英': 1.2,
        '传说': 1.5,
        '神话': 2.0
    };
    
    const multiplier = qualityMultipliers[this.quality] || 1.0;
    eggCount = Math.floor(eggCount * multiplier);
    
    // 根据健康状况调整
    if (this.health >= 80) {
        eggCount = Math.floor(eggCount * 1.2);
    } else if (this.health < 30) {
        eggCount = Math.max(1, Math.floor(eggCount * 0.5));
    }
    
    return eggCount;
};

chickenSchema.methods.getLifespanStatus = function() {
    const currentLifespan = this.lifespanManagement?.currentLifespan || this.remainingDays;
    const maxLifespan = this.lifespanManagement?.maxLifespan || 365;
    
    return {
        currentLifespan,
        maxLifespan,
        lifespanPercentage: Math.round((currentLifespan / maxLifespan) * 100),
        healthStatus: this.checkHealth(),
        lastFeedDate: this.lastFeedDate,
        active: this.active,
        deathDate: this.deathDate
    };
};

// 静态方法
chickenSchema.statics.findByFamilyId = async function(familyId) {
    return this.find({ familyId, active: true })
        .populate('ownerId', 'username')
        .populate('cooperativeOwners.userId', 'username');
};

chickenSchema.statics.findByUserId = async function(userId) {
    return this.find({
        $or: [
            { ownerId: userId },
            { 'cooperativeOwners.userId': userId }
        ]
    }).populate('familyId', 'name');
};

chickenSchema.statics.getChickenStats = async function(chickenId) {
    const chicken = await this.findById(chickenId)
        .populate('cooperativeOwners.userId', 'username');
    
    if (!chicken) {
        throw new Error('小鸡不存在');
    }
    
    const FamilyTransaction = mongoose.model('FamilyTransaction');
    
    // 获取喂养统计
    const feedStats = await FamilyTransaction.aggregate([
        {
            $match: {
                chickenId: chicken._id,
                type: 'feed_purchase'
            }
        },
        {
            $group: {
                _id: '$userId',
                totalFeeds: { $sum: 1 },
                totalPoints: { $sum: { $abs: '$amount' } },
                totalGrowth: { $sum: '$description' },
                lastFeed: { $max: '$createdAt' }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        {
            $sort: { totalFeeds: -1 }
        }
    ]);
    
    // 获取产蛋统计
    const Egg = mongoose.model('Egg');
    const eggStats = await Egg.aggregate([
        {
            $match: {
                chickenId: chicken._id
            }
        },
        {
            $group: {
                _id: null,
                totalEggs: { $sum: '$quantity' },
                totalCollected: {
                    $sum: {
                        $cond: [{ $eq: ['$collected', true] }, 1, 0]
                    }
                }
            }
        }
    ]);
    
    return {
        chicken: {
            id: chicken._id,
            name: chicken.name,
            level: chicken.level,
            quality: chicken.quality,
            health: chicken.health,
            growthValue: chicken.growthValue,
            isAdult: chicken.isAdult,
            active: chicken.active,
            lifespanStatus: chicken.getLifespanStatus()
        },
        stats: {
            feedStats: feedStats[0] || {},
            eggStats: eggStats[0] || {
                totalEggs: 0,
                totalCollected: 0
            },
            cooperativeOwners: chicken.cooperativeOwners.length
        }
    };
};

module.exports = mongoose.model('Chicken', chickenSchema);
