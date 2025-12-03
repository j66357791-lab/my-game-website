const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['member', 'admin'],
            default: 'member'
        }
    }],
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 3
    },
    maxChickens: {
        type: Number,
        default: 10
    },
    // 新增：协同领养的小鸡
    cooperativeChickens: [{
        chickenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chicken'
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        inviteDate: {
            type: Date,
            default: Date.now
        },
        contributionLevel: {
            type: String,
            enum: ['主要', '次要', '协助'],
            default: '次要'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // 新增：喂养历史记录
    feedHistory: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        chickenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chicken'
        },
        feedId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Feed'
        },
        feedDate: {
            type: Date,
            default: Date.now
        },
        pointsSpent: {
            type: Number,
            required: true
        },
        growthValue: {
            type: Number,
            required: true
        },
        feedType: {
            type: String,
            enum: ['normal', 'cooperative'],
            default: 'normal'
        }
    }],
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
familySchema.index({ ownerId: 1 });
familySchema.index({ 'members.userId': 1 });
familySchema.index({ level: 1 });

// 实例方法
familySchema.methods.updateMaxChickens = async function() {
    const levelMaxChickens = {
        1: 10,
        2: 20,
        3: 30
    };
    
    this.maxChickens = levelMaxChickens[this.level] || 10;
    await this.save();
};

familySchema.methods.addCooperativeChicken = async function(chickenId, ownerId, invitedBy, contributionLevel = '次要') {
    // 检查小鸡是否已在协同列表中
    const existingCoop = this.cooperativeChickens.find(
        coop => coop.chickenId.toString() === chickenId.toString()
    );
    
    if (existingCoop) {
        throw new Error('该小鸡已在协同列表中');
    }
    
    // 添加协同领养记录
    this.cooperativeChickens.push({
        chickenId,
        ownerId,
        invitedBy,
        contributionLevel
    });
    
    await this.save();
    return this.cooperativeChickens[this.cooperativeChickens.length - 1];
};

familySchema.methods.removeCooperativeChicken = async function(chickenId) {
    this.cooperativeChickens = this.cooperativeChickens.filter(
        coop => coop.chickenId.toString() !== chickenId.toString()
    );
    
    await this.save();
};

familySchema.methods.addFeedHistory = async function(userId, chickenId, feedId, pointsSpent, growthValue, feedType = 'normal') {
    this.feedHistory.push({
        userId,
        chickenId,
        feedId,
        pointsSpent,
        growthValue,
        feedType,
        feedDate: new Date()
    });
    
    await this.save();
};

familySchema.methods.getFeedHistory = async function(limit = 50) {
    return this.feedHistory
        .sort({ feedDate: -1 })
        .limit(limit)
        .populate('userId', 'username')
        .populate('chickenId', 'name')
        .populate('feedId', 'name');
};

familySchema.methods.getCooperativeChickens = async function() {
    return this.cooperativeChickens
        .populate('chickenId')
        .populate('ownerId', 'username')
        .populate('invitedBy', 'username');
};

// 静态方法
familySchema.statics.findByUserId = async function(userId) {
    return this.findOne({
        $or: [
            { ownerId: userId },
            { 'members.userId': userId }
        ]
    }).populate('ownerId', 'username email')
      .populate('members.userId', 'username email');
};

familySchema.statics.getFamilyStats = async function(familyId) {
    const family = await this.findById(familyId)
        .populate('members.userId', 'username');
    
    if (!family) {
        throw new Error('家庭不存在');
    }
    
    const Chicken = mongoose.model('Chicken');
    const Egg = mongoose.model('Egg');
    
    // 获取家庭小鸡统计
    const chickens = await Chicken.find({ familyId: family._id });
    const totalChickens = chickens.length;
    const adultChickens = chickens.filter(c => c.level >= 3).length;
    
    // 获取家庭鸡蛋统计
    const eggs = await Egg.find({ familyId: family._id, collected: false });
    const totalEggs = eggs.reduce((sum, egg) => sum + egg.quantity, 0);
    
    // 获取协同领养统计
    const cooperativeChickens = family.cooperativeChickens.length;
    
    return {
        family: {
            id: family._id,
            name: family.name,
            level: family.level,
            maxChickens: family.maxChickens,
            memberCount: family.members.length + 1 // +1 for owner
        },
        stats: {
            totalChickens,
            adultChickens,
            totalEggs,
            cooperativeChickens,
            coopUtilization: Math.round((totalChickens / family.maxChickens) * 100)
        }
    };
};

module.exports = mongoose.model('Family', familySchema);
