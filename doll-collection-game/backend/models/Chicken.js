const mongoose = require('mongoose');

const chickenSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: true,
        trim: true
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
        default: 0
    },
    lifespan: {
        type: Number,
        default: 180
    },
    isAdult: {
        type: Boolean,
        default: false
    },
    lastFeedDate: {
        type: Date,
        default: Date.now
    },
    dailyGrowthRequirement: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 成长值需求倍数
chickenSchema.methods.getGrowthMultiplier = function() {
    const multipliers = {
        '普通': 2.5,
        '精英': 2.3,
        '传说': 2.2,
        '神话': 2.0
    };
    return multipliers[this.quality] || 2.5;
};

// 获取当前等级所需成长值
chickenSchema.methods.getRequiredGrowth = function() {
    const requirements = [0, 200, 500, 1250, 3125, 7813, 19530];
    const multiplier = this.getGrowthMultiplier();
    return Math.floor(requirements[this.level + 1] * multiplier);
};

// 检查是否可以升级
chickenSchema.methods.canUpgrade = function() {
    if (this.level >= 6) return false;
    const requiredGrowth = this.getRequiredGrowth();
    return this.growthValue >= requiredGrowth;
};

// 升级小鸡
chickenSchema.methods.upgrade = function() {
    if (!this.canUpgrade()) return false;
    
    this.level += 1;
    const requiredGrowth = this.getRequiredGrowth();
    this.growthValue -= requiredGrowth;
    
    // 升级奖励寿命
    const lifespanBonus = {
        4: 5,
        5: 15,
        6: 40
    };
    
    if (lifespanBonus[this.level]) {
        this.lifespan += lifespanBonus[this.level];
    }
    
    // 3级以上为成年
    if (this.level >= 3) {
        this.isAdult = true;
    }
    
    // 设置每日成长值需求
    const dailyRequirements = {
        3: 30,
        4: 60,
        5: 100,
        6: 200
    };
    
    this.dailyGrowthRequirement = dailyRequirements[this.level] || 0;
    
    return this.save();
};

// 计算产蛋数量
chickenSchema.methods.calculateEggProduction = function() {
    if (!this.isAdult || this.level < 3) return 0;
    
    const eggRanges = {
        3: { min: 0.5, max: 1, weights: [0.2, 0.8] },
        4: { min: 1, max: 2, weights: [0.4, 0.6] },
        5: { min: 1, max: 4, weights: [0.15, 0.5, 0.3, 0.05] },
        6: { min: 2, max: 5, weights: [0.15, 0.45, 0.4] }
    };
    
    const range = eggRanges[this.level];
    if (!range) return 0;
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < range.weights.length; i++) {
        cumulative += range.weights[i];
        if (random <= cumulative) {
            return range.min + i;
        }
    }
    
    return range.min;
};

// 检查健康状态
chickenSchema.methods.checkHealth = function() {
    if (!this.isAdult) return true;
    
    const today = new Date().toDateString();
    const lastFeed = this.lastFeedDate.toDateString();
    
    if (today !== lastFeed) {
        return false; // 今天没有喂养
    }
    
    // 检查每日成长值是否达标
    return this.dailyGrowthRequirement <= 0; // 简化版本，实际需要记录今日成长值
};

module.exports = mongoose.model('Chicken', chickenSchema);
