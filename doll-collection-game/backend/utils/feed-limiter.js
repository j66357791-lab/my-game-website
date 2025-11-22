const Chicken = require('../models/Chicken');

class FeedLimiter {
    // 检查用户是否可以喂养小鸡
    static async canFeed(userId, chickenId) {
        try {
            const chicken = await Chicken.findById(chickenId);
            if (!chicken) {
                return { canFeed: false, reason: '小鸡不存在' };
            }
            
            // 检查用户权限
            const hasPermission = await this.checkFeedPermission(userId, chicken);
            if (!hasPermission.allowed) {
                return { canFeed: false, reason: hasPermission.reason };
            }
            
            // 检查每日喂养限制
            const dailyLimit = await this.checkDailyFeedLimit(userId, chickenId);
            if (!dailyLimit.canFeed) {
                return { canFeed: false, reason: dailyLimit.reason };
            }
            
            return { canFeed: true };
        } catch (error) {
            throw new Error(`检查喂养权限失败: ${error.message}`);
        }
    }
    
    // 检查喂养权限
    static async checkFeedPermission(userId, chicken) {
        // 检查是否是小鸡主人
        if (chicken.ownerId && chicken.ownerId.toString() === userId) {
            return { allowed: true };
        }
        
        // 检查是否是协作所有者
        const cooperativeOwners = chicken.cooperativeOwners || [];
        const isCooperativeOwner = cooperativeOwners.some(owner => 
            owner.userId && owner.userId.toString() === userId
        );
        
        if (isCooperativeOwner) {
            return { allowed: true };
        }
        
        // 检查是否在同一个家庭
        const Family = mongoose.model('Family');
        const family = await Family.findOne({
            $or: [
                { ownerId: userId },
                { 'members.userId': userId }
            ]
        });
        
        if (family && family._id.equals(chicken.familyId)) {
            return { allowed: true };
        }
        
        return { allowed: false, reason: '没有权限喂养这只小鸡' };
    }
    
    // 检查每日喂养限制
    static async checkDailyFeedLimit(userId, chickenId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // 获取用户今天的喂养记录
            const FamilyTransaction = mongoose.model('FamilyTransaction');
            const todayFeeds = await FamilyTransaction.find({
                userId: userId,
                chickenId: chickenId,
                type: 'feed_purchase',
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                }
            });
            
            const dailyLimit = chicken.dailyFeedLimit || 1;
            
            if (todayFeeds.length >= dailyLimit) {
                return {
                    canFeed: false,
                    reason: `今日喂养次数已达上限(${dailyLimit}次)`,
                    remainingFeeds: 0,
                    nextFeedTime: tomorrow
                };
            }
            
            return {
                canFeed: true,
                remainingFeeds: dailyLimit - todayFeeds.length,
                nextFeedTime: todayFeeds.length === 0 ? new Date() : tomorrow
            };
        } catch (error) {
            throw new Error(`检查每日喂养限制失败: ${error.message}`);
        }
    }
    
    // 记录喂养操作
    static async recordFeed(userId, chickenId, feedId, pointsSpent) {
        try {
            const FamilyTransaction = mongoose.model('FamilyTransaction');
            
            // 记录喂养交易
            await FamilyTransaction.create({
                familyId: null, // 将在后续更新
                userId: userId,
                chickenId: chickenId,
                feedId: feedId,
                type: 'feed_purchase',
                amount: -pointsSpent,
                description: `喂养小鸡，消耗${pointsSpent}积分`
            });
            
            // 更新小鸡的最后喂养时间
            await Chicken.findByIdAndUpdate(chickenId, {
                lastFeedDate: new Date()
            });
            
            return { success: true };
        } catch (error) {
            throw new Error(`记录喂养操作失败: ${error.message}`);
        }
    }
    
    // 获取用户喂养统计
    static async getUserFeedStats(userId, chickenId = null) {
        try {
            const FamilyTransaction = mongoose.model('FamilyTransaction');
            
            let matchQuery = {
                userId: userId,
                type: 'feed_purchase'
            };
            
            if (chickenId) {
                matchQuery.chickenId = chickenId;
            }
            
            const stats = await FamilyTransaction.aggregate([
                {
                    $match: matchQuery
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        totalFeeds: { $sum: 1 },
                        totalPoints: { $sum: { $abs: '$amount' } }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
                },
                {
                    $limit: 30
                }
            ]);
            
            return stats;
        } catch (error) {
            throw new Error(`获取喂养统计失败: ${error.message}`);
        }
    }
    
    // 获取小鸡喂养统计
    static async getChickenFeedStats(chickenId) {
        try {
            const FamilyTransaction = mongoose.model('FamilyTransaction');
            
            const stats = await FamilyTransaction.aggregate([
                {
                    $match: {
                        chickenId: chickenId,
                        type: 'feed_purchase'
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        totalFeeds: { $sum: 1 },
                        totalPoints: { $sum: { $abs: '$amount' } },
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
            
            return stats;
        } catch (error) {
            throw new Error(`获取小鸡喂养统计失败: ${error.message}`);
        }
    }
    
    // 重置每日喂养限制（管理员功能）
    static async resetDailyFeedLimit(chickenId, userId = null) {
        try {
            const FamilyTransaction = mongoose.model('FamilyTransaction');
            
            let matchQuery = {
                chickenId: chickenId,
                type: 'feed_purchase'
            };
            
            if (userId) {
                matchQuery.userId = userId;
            }
            
            const result = await FamilyTransaction.deleteMany(matchQuery);
            
            return {
                success: true,
                message: `重置喂养限制成功，删除${result.deletedCount}条记录`,
                deletedCount: result.deletedCount
            };
        } catch (error) {
            throw new Error(`重置喂养限制失败: ${error.message}`);
        }
    }
}

module.exports = FeedLimiter;
