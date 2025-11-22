const Chicken = require('../models/Chicken');
const User = require('../models/User');

class LifespanManager {
    // 检查并更新所有小鸡寿命
    static async checkAndUpdateLifespans() {
        try {
            console.log('🔍 开始检查小鸡寿命...');
            
            const chickens = await Chicken.find({ active: true });
            console.log(`找到 ${chickens.length} 只活跃小鸡`);
            
            const results = {
                processed: 0,
                lifespanReduced: 0,
                lifespanExtended: 0,
                deactivated: 0,
                errors: []
            };
            
            for (const chicken of chickens) {
                try {
                    const result = await this.processChickenLifespan(chicken);
                    results.processed++;
                    
                    if (result.reduced) {
                        results.lifespanReduced++;
                    }
                    if (result.extended) {
                        results.lifespanExtended++;
                    }
                    if (result.deactivated) {
                        results.deactivated++;
                    }
                } catch (error) {
                    console.error(`处理小鸡 ${chicken._id} 寿命时出错:`, error);
                    results.errors.push({
                        chickenId: chicken._id,
                        error: error.message
                    });
                }
            }
            
            console.log('✅ 小鸡寿命检查完成:', results);
            return results;
        } catch (error) {
            throw new Error(`寿命检查失败: ${error.message}`);
        }
    }
    
    // 处理单只小鸡的寿命
    static async processChickenLifespan(chicken) {
        const result = {
            reduced: false,
            extended: false,
            deactivated: false,
            changes: []
        };
        
        // 检查是否需要减少寿命
        const reductionResult = await this.checkLifespanReduction(chicken);
        if (reductionResult) {
            const reduction = await this.reduceLifespan(chicken, reductionResult);
            result.reduced = true;
            result.changes.push(reduction);
            
            if (reduction.newLifespan === 0) {
                result.deactivated = true;
            }
        }
        
        // 检查是否需要延长寿命
        if (!result.deactivated) {
            const extensionResult = await this.checkLifespanExtension(chicken);
            if (extensionResult) {
                const extension = await this.extendLifespan(chicken, extensionResult);
                result.extended = true;
                result.changes.push(extension);
            }
        }
        
        return result;
    }
    
    // 检查是否需要减少寿命
    static async checkLifespanReduction(chicken) {
        const lastFeed = chicken.lastFeedDate || chicken.createdAt;
        const now = new Date();
        const daysWithoutFeed = Math.floor((now - lastFeed) / (1000 * 60 * 60 * 24));
        
        // 超过3天未喂养，减少寿命
        if (daysWithoutFeed > 3) {
            return {
                reason: '未喂养',
                daysToReduce: Math.min(daysWithoutFeed - 3, 7), // 最多减少7天
                severity: daysWithoutFeed > 7 ? '严重' : '轻微'
            };
        }
        
        // 检查健康状况
        const healthStatus = chicken.checkHealth();
        if (!healthStatus) {
            return {
                reason: '健康状况不佳',
                daysToReduce: 3,
                severity: '中等'
            };
        }
        
        // 检查成长值是否过低
        const growthRequirement = this.getGrowthRequirement(chicken.level);
        if (chicken.growthValue < growthRequirement * 0.3) {
            return {
                reason: '成长值过低',
                daysToReduce: 2,
                severity: '轻微'
            };
        }
        
        return null;
    }
    
    // 减少小鸡寿命
    static async reduceLifespan(chicken, reductionInfo) {
        try {
            const daysToReduce = reductionInfo.daysToReduce || 3;
            const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
            const newLifespan = Math.max(0, currentLifespan - daysToReduce);
            
            // 记录寿命减少
            const reduction = {
                date: new Date(),
                reason: reductionInfo.reason,
                daysReduced: daysToReduce,
                severity: reductionInfo.severity || '轻微',
                reducedBy: chicken.ownerId
            };
            
            // 更新小鸡寿命
            if (!chicken.lifespanManagement) {
                chicken.lifespanManagement = {
                    currentLifespan: currentLifespan,
                    maxLifespan: 365,
                    lifespanReductions: [],
                    lifespanExtensions: []
                };
            }
            
            chicken.lifespanManagement.currentLifespan = newLifespan;
            chicken.lifespanManagement.lifespanReductions.push(reduction);
            
            // 如果寿命为0，设为非活跃
            if (newLifespan === 0) {
                chicken.active = false;
                chicken.deathDate = new Date();
            }
            
            await chicken.save();
            
            return {
                success: true,
                message: `小鸡${chicken.name}寿命减少${daysToReduce}天，原因：${reductionInfo.reason}`,
                oldLifespan: currentLifespan,
                newLifespan: newLifespan,
                deactivated: newLifespan === 0,
                reduction: reduction
            };
        } catch (error) {
            throw new Error(`减少寿命失败: ${error.message}`);
        }
    }
    
    // 检查是否需要延长寿命
    static async checkLifespanExtension(chicken) {
        const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
        const maxLifespan = chicken.lifespanManagement?.maxLifespan || 365;
        
        // 检查是否已达到最大寿命
        if (currentLifespan >= maxLifespan) {
            return null;
        }
        
        let extensionPoints = 0;
        let extensionReason = '';
        
        // 检查喂养频率
        const feedHistory = chicken.feedHistory || [];
        const recentFeeds = feedHistory.filter(feed => {
            const feedDate = new Date(feed.feedDate);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return feedDate > weekAgo;
        });
        
        if (recentFeeds.length >= 5) {
            extensionPoints += 1;
            extensionReason = '频繁喂养';
        }
        
        // 检查协作喂养情况
        const cooperativeOwners = chicken.cooperativeOwners || [];
        if (cooperativeOwners.length >= 2) {
            extensionPoints += 2;
            extensionReason = '协作喂养';
        }
        
        // 检查健康状况
        const healthStatus = chicken.checkHealth();
        if (healthStatus && chicken.growthValue > this.getGrowthRequirement(chicken.level) * 0.8) {
            extensionPoints += 1;
            extensionReason = '健康状况良好';
        }
        
        if (extensionPoints > 0) {
            return {
                reason: extensionReason,
                daysToExtend: extensionPoints,
                quality: extensionPoints >= 2 ? '优秀' : '良好'
            };
        }
        
        return null;
    }
    
    // 延长小鸡寿命
    static async extendLifespan(chicken, extensionInfo) {
        try {
            const daysToExtend = extensionInfo.daysToExtend || 1;
            const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
            const maxLifespan = chicken.lifespanManagement?.maxLifespan || 365;
            const newLifespan = Math.min(maxLifespan, currentLifespan + daysToExtend);
            
            // 记录寿命延长
            const extension = {
                date: new Date(),
                reason: extensionInfo.reason,
                daysExtended: daysToExtend,
                quality: extensionInfo.quality || '良好',
                extendedBy: chicken.ownerId
            };
            
            // 更新小鸡寿命
            if (!chicken.lifespanManagement) {
                chicken.lifespanManagement = {
                    currentLifespan: currentLifespan,
                    maxLifespan: maxLifespan,
                    lifespanReductions: [],
                    lifespanExtensions: []
                };
            }
            
            chicken.lifespanManagement.currentLifespan = newLifespan;
            chicken.lifespanManagement.lifespanExtensions.push(extension);
            
            // 如果之前是非活跃的，重新激活
            if (!chicken.active && newLifespan > 0) {
                chicken.active = true;
                chicken.deathDate = null;
            }
            
            await chicken.save();
            
            return {
                success: true,
                message: `小鸡${chicken.name}寿命延长${daysToExtend}天，原因：${extensionInfo.reason}`,
                oldLifespan: currentLifespan,
                newLifespan: newLifespan,
                reactivated: !chicken.active && newLifespan > 0,
                extension: extension
            };
        } catch (error) {
            throw new Error(`延长寿命失败: ${error.message}`);
        }
    }
    
    // 手动调整小鸡寿命
    static async manualAdjustLifespan(chickenId, days, reason, adminId) {
        try {
            const chicken = await Chicken.findById(chickenId);
            if (!chicken) {
                throw new Error('小鸡不存在');
            }
            
            const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
            const maxLifespan = chicken.lifespanManagement?.maxLifespan || 365;
            const newLifespan = Math.max(0, Math.min(maxLifespan, currentLifespan + days));
            
            const adjustment = {
                date: new Date(),
                reason: reason || '管理员调整',
                daysAdjusted: days,
                adjustedBy: adminId
            };
            
            // 更新小鸡寿命
            if (!chicken.lifespanManagement) {
                chicken.lifespanManagement = {
                    currentLifespan: currentLifespan,
                    maxLifespan: maxLifespan,
                    lifespanReductions: [],
                    lifespanExtensions: []
                };
            }
            
            chicken.lifespanManagement.currentLifespan = newLifespan;
            
            if (days > 0) {
                chicken.lifespanManagement.lifespanExtensions.push(adjustment);
            } else {
                chicken.lifespanManagement.lifespanReductions.push(adjustment);
            }
            
            // 更新活跃状态
            if (newLifespan === 0) {
                chicken.active = false;
                chicken.deathDate = new Date();
            } else if (newLifespan > 0 && !chicken.active) {
                chicken.active = true;
                chicken.deathDate = null;
            }
            
            await chicken.save();
            
            return {
                success: true,
                message: `小鸡${chicken.name}寿命调整成功，从${currentLifespan}天调整为${newLifespan}天`,
                oldLifespan: currentLifespan,
                newLifespan: newLifespan,
                adjustment: adjustment
            };
        } catch (error) {
            throw new Error(`手动调整寿命失败: ${error.message}`);
        }
    }
    
    // 获取小鸡寿命报告
    static async getLifespanReport(chickenId) {
        try {
            const chicken = await Chicken.findById(chickenId)
                .populate('lifespanManagement.lifespanReductions.reducedBy', 'username')
                .populate('lifespanManagement.lifespanExtensions.extendedBy', 'username');
            
            if (!chicken) {
                throw new Error('小鸡不存在');
            }
            
            const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
            const maxLifespan = chicken.lifespanManagement?.maxLifespan || 365;
            
            return {
                chickenId: chicken._id,
                name: chicken.name,
                level: chicken.level,
                quality: chicken.quality,
                currentLifespan: currentLifespan,
                maxLifespan: maxLifespan,
                lifespanPercentage: Math.round((currentLifespan / maxLifespan) * 100),
                healthStatus: chicken.checkHealth(),
                lastFeedDate: chicken.lastFeedDate,
                active: chicken.active,
                deathDate: chicken.deathDate,
                lifespanReductions: chicken.lifespanManagement?.lifespanReductions || [],
                lifespanExtensions: chicken.lifespanManagement?.lifespanExtensions || [],
                recommendations: this.getLifespanRecommendations(chicken)
            };
        } catch (error) {
            throw new Error(`获取寿命报告失败: ${error.message}`);
        }
    }
    
    // 获取寿命建议
    static getLifespanRecommendations(chicken) {
        const recommendations = [];
        const currentLifespan = chicken.lifespanManagement?.currentLifespan || chicken.remainingDays;
        const maxLifespan = chicken.lifespanManagement?.maxLifespan || 365;
        
        // 寿命过低建议
        if (currentLifespan < maxLifespan * 0.3) {
            recommendations.push({
                type: 'warning',
                message: '小鸡寿命过低，建议增加喂养频率',
                priority: 'high'
            });
        }
        
        // 健康状况建议
        if (!chicken.checkHealth()) {
            recommendations.push({
                type: 'danger',
                message: '小鸡健康状况不佳，建议立即喂养',
                priority: 'critical'
            });
        }
        
        // 协作喂养建议
        const cooperativeOwners = chicken.cooperativeOwners || [];
        if (cooperativeOwners.length === 0) {
            recommendations.push({
                type: 'info',
                message: '建议邀请好友协作喂养，可延长小鸡寿命',
                priority: 'low'
            });
        }
        
        return recommendations;
    }
    
    // 获取成长值要求
    static getGrowthRequirement(level) {
        const baseRequirements = {
            1: 200,
            2: 500,
            3: 1250,
            4: 3125,
            5: 7813,
            6: 19530
        };
        return baseRequirements[level] || 0;
    }
}

module.exports = LifespanManager;
