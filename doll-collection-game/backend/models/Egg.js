const mongoose = require('mongoose');

const eggSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },
    chickenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chicken',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    collected: {
        type: Boolean,
        default: false
    },
    collectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    collectedAt: {
        type: Date
    },
    // 新增：兑换状态
    exchanged: {
        type: Boolean,
        default: false
    },
    exchangedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    exchangedAt: {
        type: Date
    },
    exchangePoints: {
        type: Number,
        default: 100 // 1个鸡蛋 = 100积分
    },
    // 新增：鸡蛋品质
    quality: {
        type: String,
        enum: ['普通', '优质', '稀有', '传说'],
        default: '普通'
    },
    // 新增：生产日期
    productionDate: {
        type: Date,
        default: Date.now
    },
    // 新增：新鲜度
    freshness: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
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
eggSchema.index({ familyId: 1 });
eggSchema.index({ chickenId: 1 });
eggSchema.index({ collected: 1 });
eggSchema.index({ exchanged: 1 });
eggSchema.index({ productionDate: 1 });

// 实例方法
eggSchema.methods.collect = async function(userId) {
    if (this.collected) {
        throw new Error('鸡蛋已被收集');
    }
    
    this.collected = true;
    this.collectedBy = userId;
    this.collectedAt = new Date();
    
    await this.save();
    
    return {
        success: true,
        points: this.quantity * this.exchangePoints
    };
};

eggSchema.methods.exchange = async function(userId) {
    if (this.exchanged) {
        throw new Error('鸡蛋已被兑换');
    }
    
    this.exchanged = true;
    this.exchangedBy = userId;
    this.exchangedAt = new Date();
    
    await this.save();
    
    return {
        success: true,
        points: this.quantity * this.exchangePoints
    };
};

eggSchema.methods.updateFreshness = function() {
    const now = new Date();
    const ageInDays = Math.floor((now - this.productionDate) / (1000 * 60 * 60 * 24));
    
    // 新鲜度随时间下降
    this.freshness = Math.max(0, 100 - (ageInDays * 2));
    
    // 根据新鲜度调整品质
    if (this.freshness >= 80) {
        this.quality = '传说';
    } else if (this.freshness >= 60) {
        this.quality = '稀有';
    } else if (this.freshness >= 40) {
        this.quality = '优质';
    } else {
        this.quality = '普通';
    }
    
    return this.freshness;
};

eggSchema.methods.getEggInfo = function() {
    return {
        id: this._id,
        quantity: this.quantity,
        quality: this.quality,
        freshness: this.freshness,
        exchangePoints: this.exchangePoints,
        totalPoints: this.quantity * this.exchangePoints,
        productionDate: this.productionDate,
        ageInDays: Math.floor((new Date() - this.productionDate) / (1000 * 60 * 60 * 24)),
        collected: this.collected,
        exchanged: this.exchanged,
        status: this.getStatus()
    };
};

eggSchema.methods.getStatus = function() {
    if (this.exchanged) {
        return '已兑换';
    } else if (this.collected) {
        return '已收集';
    } else if (this.freshness < 20) {
        return '即将变质';
    } else if (this.freshness < 50) {
        return '新鲜度一般';
    } else {
        return '新鲜';
    }
};

// 静态方法
eggSchema.statics.findByFamilyId = async function(familyId, options = {}) {
    const query = { familyId };
    
    if (options.collected !== undefined) {
        query.collected = options.collected;
    }
    
    if (options.exchanged !== undefined) {
        query.exchanged = options.exchanged;
    }
    
    return this.find(query)
        .populate('chickenId', 'name level quality')
        .populate('collectedBy', 'username')
        .populate('exchangedBy', 'username')
        .sort({ productionDate: -1 });
};

eggSchema.statics.getEggStats = async function(familyId) {
    const eggs = await this.find({ familyId });
    
    const stats = {
        total: eggs.length,
        collected: eggs.filter(e => e.collected).length,
        exchanged: eggs.filter(e => e.exchanged).length,
        available: eggs.filter(e => !e.collected && !e.exchanged).length,
        totalQuantity: eggs.reduce((sum, egg) => sum + egg.quantity, 0),
        totalPoints: eggs.reduce((sum, egg) => sum + (egg.quantity * egg.exchangePoints), 0),
        qualityDistribution: {},
        freshnessDistribution: {
            high: eggs.filter(e => e.freshness >= 80).length,
            medium: eggs.filter(e => e.freshness >= 40 && e.freshness < 80).length,
            low: eggs.filter(e => e.freshness < 40).length
        }
    };
    
    // 计算品质分布
    eggs.forEach(egg => {
        stats.qualityDistribution[egg.quality] = (stats.qualityDistribution[egg.quality] || 0) + 1;
    });
    
    return stats;
};

eggSchema.statics.updateAllFreshness = async function() {
    const eggs = await this.find({ exchanged: false, collected: false });
    
    const results = {
        updated: 0,
        qualityChanges: {}
    };
    
    for (const egg of eggs) {
        const oldQuality = egg.quality;
        const newFreshness = egg.updateFreshness();
        const newQuality = egg.quality;
        
        if (oldQuality !== newQuality) {
            results.qualityChanges[newQuality] = (results.qualityChanges[newQuality] || 0) + 1;
        }
        
        await egg.save();
        results.updated++;
    }
    
    return results;
};

module.exports = mongoose.model('Egg', eggSchema);
