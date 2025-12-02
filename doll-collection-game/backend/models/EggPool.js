const mongoose = require('mongoose');

const eggPoolSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true,
        unique: true
    },
    totalEggs: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    dailyReleaseRate: {
        type: Number,
        default: 0.01 // 每日释放1%
    },
    lastReleaseDate: {
        type: Date,
        default: Date.now
    },
    releaseHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        eggsReleased: {
            type: Number,
            default: 0
        },
        pointsReleased: {
            type: Number,
            default: 0
        },
        userShares: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            pointsReceived: {
                type: Number,
                default: 0
            }
        }]
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// 索引
eggPoolSchema.index({ familyId: 1 });
eggPoolSchema.index({ lastReleaseDate: 1 });

// 静态方法
eggPoolSchema.statics = {
    // 获取或创建家庭积分池
    async getOrCreatePool(familyId) {
        let pool = await this.findOne({ familyId });
        if (!pool) {
            pool = await this.create({ familyId });
        }
        return pool;
    },
    
    // 添加鸡蛋到积分池
    async addEggs(familyId, eggCount) {
        const pool = await this.getOrCreatePool(familyId);
        pool.totalEggs += eggCount;
        pool.totalPoints += eggCount * 100; // 1个鸡蛋 = 100积分
        await pool.save();
        return pool;
    },
    
    // 每日释放积分
    async dailyRelease(familyId) {
        const pool = await this.findOne({ familyId, isActive: true });
        if (!pool) return null;
        
        // 检查是否已经释放过今天
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (pool.lastReleaseDate >= today) {
            return { message: '今日已释放过积分', released: false };
        }
        
        const releasePoints = Math.floor(pool.totalPoints * pool.dailyReleaseRate);
        
        if (releasePoints <= 0) {
            return { message: '无可释放积分', released: false };
        }
        
        // 获取家庭成员
        const Family = mongoose.model('Family');
        const family = await Family.findById(familyId).populate('members.userId');
        
        if (!family) {
            return { message: '家庭不存在', released: false };
        }
        
        const memberIds = [
            family.ownerId,
            ...family.members.map(m => m.userId)
        ];
        
        const pointsPerMember = Math.floor(releasePoints / memberIds.length);
        
        // 分配积分给成员
        const User = mongoose.model('User');
        const userShares = [];
        
        for (const userId of memberIds) {
            await User.findByIdAndUpdate(userId, {
                $inc: { points: pointsPerMember }
            });
            
            userShares.push({
                userId: userId,
                pointsReceived: pointsPerMember
            });
        }
        
        // 更新积分池
        pool.totalPoints -= releasePoints;
        pool.lastReleaseDate = new Date();
        pool.releaseHistory.push({
            date: new Date(),
            pointsReleased: releasePoints,
            userShares: userShares
        });
        
        await pool.save();
        
        return {
            message: '积分释放成功',
            released: true,
            pointsReleased: releasePoints,
            pointsPerMember: pointsPerMember,
            userShares: userShares
        };
    }
};

module.exports = mongoose.model('EggPool', eggPoolSchema);
