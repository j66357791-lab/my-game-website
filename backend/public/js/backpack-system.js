// 背包系统 - 完整版
class BackpackSystem {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.backpackData = {
            items: [],
            capacity: 100,
            categories: ['all', 'consumable', 'equipment', 'skin', 'currency', 'special'],
            selectedCategory: 'all'
        };
        this.itemConfig = {
            // 消耗品
            'cane': {
                id: 'cane',
                name: '奶奶的拐杖',
                icon: '🦯',
                description: '娃娃合成道具，用于升级娃娃等级',
                category: 'consumable',
                rarity: 'common',
                value: 50,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 99,
                source: 'doll',
                craftable: true
            },
            'protection': {
                id: 'protection',
                name: '免伤卡',
                icon: '🛡️',
                description: '恐怖奶奶游戏道具，被抓时免受损失',
                category: 'consumable',
                rarity: 'rare',
                value: 100,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 10,
                source: 'grandma',
                craftable: false
            },
            'resurrection': {
                id: 'resurrection',
                name: '复活币',
                icon: '💰',
                description: '游戏失败时使用，避免损失积分',
                category: 'consumable',
                rarity: 'common',
                value: 80,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 20,
                source: 'game',
                craftable: false
            },
            'exp_boost': {
                id: 'exp_boost',
                name: '经验加速卡',
                icon: '⚡',
                description: '24小时内所有游戏经验值提升50%',
                category: 'consumable',
                rarity: 'rare',
                value: 150,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 5,
                source: 'mall',
                craftable: false
            },
            'double_points': {
                id: 'double_points',
                name: '双倍积分卡',
                icon: '💎',
                description: '7天内所有游戏积分收益翻倍',
                category: 'consumable',
                rarity: 'epic',
                value: 300,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 3,
                source: 'mall',
                craftable: false
            },
            'lucky_charm': {
                id: 'lucky_charm',
                name: '幸运符',
                icon: '🍀',
                description: '增加15%的获胜概率，使用后下一回合生效',
                category: 'consumable',
                rarity: 'rare',
                value: 120,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 8,
                source: 'mall',
                craftable: false
            },
            'speed_boost': {
                id: 'speed_boost',
                name: '加速药水',
                icon: '⚡',
                description: '减少5秒投注锁定时间，使用后立即生效',
                category: 'consumable',
                rarity: 'common',
                value: 60,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 10,
                source: 'mall',
                craftable: false
            },
            'vip_ticket': {
                id: 'vip_ticket',
                name: 'VIP体验卡',
                icon: '👑',
                description: '7天VIP会员体验，享受专属特权',
                category: 'consumable',
                rarity: 'epic',
                value: 500,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 2,
                source: 'mall',
                craftable: false
            },
            'mystery_box': {
                id: 'mystery_box',
                name: '神秘盲盒',
                icon: '🎁',
                description: '包含随机道具的神秘盲盒',
                category: 'currency',
                rarity: 'legendary',
                value: 200,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 99,
                source: 'mall',
                craftable: false
            },
            // 装备品
            'night_vision': {
                id: 'night_vision',
                name: '夜视仪',
                icon: '👓',
                description: '恐怖奶奶游戏中显示奶奶的真实位置，增加30%的存活概率',
                category: 'equipment',
                rarity: 'epic',
                value: 400,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                equipEffect: {
                    game: 'grandma',
                    effect: 'reveal_grandma',
                    bonus: 0.3
                }
            },
            'stealth_boots': {
                id: 'stealth_boots',
                name: '隐身靴',
                icon: '👟',
                description: '减少50%被抓的概率，装备后持续生效',
                category: 'equipment',
                rarity: 'rare',
                value: 250,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                equipEffect: {
                    game: 'grandma',
                    effect: 'reduce_detection',
                    bonus: 0.5
                }
            },
            'lucky_amulet': {
                id: 'lucky_amulet',
                name: '幸运护身符',
                icon: '🧿',
                description: '增加20%的获胜概率，装备后持续生效',
                category: 'equipment',
                rarity: 'rare',
                value: 200,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                equipEffect: {
                    game: 'all',
                    effect: 'luck_bonus',
                    bonus: 0.2
                }
            },
            'experience_ring': {
                id: 'experience_ring',
                name: '经验戒指',
                icon: '💍',
                description: '所有游戏经验值提升25%，装备后持续生效',
                category: 'equipment',
                rarity: 'epic',
                value: 350,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                equipEffect: {
                    game: 'all',
                    effect: 'exp_bonus',
                    bonus: 0.25
                }
            },
            // 皮肤
            'golden_skin': {
                id: 'golden_skin',
                name: '黄金皮肤',
                icon: '🏆',
                description: '华丽的黄金主题皮肤，彰显尊贵身份',
                category: 'skin',
                rarity: 'legendary',
                value: 800,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                skinType: 'theme',
                applyTo: 'all'
            },
            'crystal_skin': {
                id: 'crystal_skin',
                name: '水晶皮肤',
                icon: '💎',
                description: '透明的水晶主题皮肤，充满科技感',
                category: 'skin',
                rarity: 'epic',
                value: 500,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                skinType: 'theme',
                applyTo: 'all'
            },
            'neon_skin': {
                id: 'neon_skin',
                name: '霓虹皮肤',
                icon: '🌈',
                description: '炫彩的霓虹主题皮肤，充满活力',
                category: 'skin',
                rarity: 'rare',
                value: 300,
                usable: true,
                consumable: false,
                stackable: false,
                maxStack: 1,
                source: 'mall',
                craftable: false,
                skinType: 'theme',
                applyTo: 'all'
            },
            // 特殊物品
            'grandma_photo': {
                id: 'grandma_photo',
                name: '奶奶的照片',
                icon: '📷',
                description: '神秘的奶奶照片，据说能带来好运',
                category: 'special',
                rarity: 'legendary',
                value: 1000,
                usable: false,
                consumable: false,
                stackable: true,
                maxStack: 1,
                source: 'achievement',
                craftable: false
            },
            'lucky_key': {
                id: 'lucky_key',
                name: '幸运钥匙',
                icon: '🗝️',
                description: '可以打开秘密房间的钥匙',
                category: 'special',
                rarity: 'epic',
                value: 600,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 5,
                source: 'achievement',
                craftable: false
            },
            'treasure_map': {
                id: 'treasure_map',
                name: '藏宝图',
                icon: '🗺️',
                description: '标记了宝藏位置的神秘地图',
                category: 'special',
                rarity: 'rare',
                value: 400,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 3,
                source: 'achievement',
                craftable: false
            },
            // 货币
            'points_voucher': {
                id: 'points_voucher',
                name: '积分券',
                icon: '🎫',
                description: '可兑换100积分的优惠券',
                category: 'currency',
                rarity: 'common',
                value: 100,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 50,
                source: 'mall',
                craftable: false
            },
            'premium_token': {
                id: 'premium_token',
                name: '高级代币',
                icon: '🪙',
                description: '高级商店专用代币',
                category: 'currency',
                rarity: 'epic',
                value: 500,
                usable: true,
                consumable: true,
                stackable: true,
                maxStack: 20,
                source: 'mall',
                craftable: false
            }
        };
    }
    
    // 初始化
    async init() {
        console.log('=== 背包系统初始化 ===');
        
        try {
            // 等待用户系统加载
            await this.waitForUserSystem();
            
            // 加载当前用户
            this.loadCurrentUser();
            
            // 加载背包数据
            this.loadBackpackData();
            
            // 初始化事件监听
            this.initEventListeners();
            
            // 同步其他系统的物品
            this.syncFromOtherSystems();
            
            this.isInitialized = true;
            console.log('背包系统初始化完成');
            
            return true;
        } catch (error) {
            console.error('背包系统初始化失败:', error);
            return false;
        }
    }
    
    // 等待用户系统
    waitForUserSystem() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkUserSystem = () => {
                attempts++;
                
                if (window.userSystem && window.userSystem.isInitialized) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkUserSystem, 100);
                } else {
                    console.error('背包系统：用户系统加载超时');
                    resolve();
                }
            };
            
            checkUserSystem();
        });
    }
    
    // 加载当前用户
    loadCurrentUser() {
        try {
            if (window.userSystem && window.userSystem.currentUser) {
                this.currentUser = window.userSystem.currentUser;
                console.log('背包系统：用户已加载', this.currentUser.name);
            } else {
                const userData = localStorage.getItem('currentUser');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    console.log('背包系统：从localStorage加载用户', this.currentUser.name);
                }
            }
        } catch (error) {
            console.error('背包系统：加载用户失败', error);
        }
    }
    
    // 加载背包数据
    loadBackpackData() {
        try {
            if (!this.currentUser) {
                console.warn('背包系统：用户未登录，使用默认数据');
                return;
            }
            
            const savedBackpack = localStorage.getItem(`backpack_${this.currentUser.id}`);
            if (savedBackpack) {
                this.backpackData = JSON.parse(savedBackpack);
                console.log('背包系统：背包数据已加载', this.backpackData.items.length, '个物品');
            } else {
                console.log('背包系统：未找到背包数据，使用默认数据');
                this.initializeDefaultBackpack();
            }
        } catch (error) {
            console.error('背包系统：加载背包数据失败', error);
        }
    }
    
    // 初始化默认背包
    initializeDefaultBackpack() {
        // 添加初始物品
        this.backpackData.items = [
            {
                ...this.itemConfig['mystery_box'],
                count: 1
            },
            {
                ...this.itemConfig['resurrection'],
                count: 3
            }
        ];
        
        this.saveBackpackData();
    }
    
    // 保存背包数据
    saveBackpackData() {
        try {
            if (!this.currentUser) {
                console.warn('背包系统：用户未登录，无法保存');
                return;
            }
            
            localStorage.setItem(`backpack_${this.currentUser.id}`, JSON.stringify(this.backpackData));
            console.log('背包系统：背包数据已保存');
        } catch (error) {
            console.error('背包系统：保存背包数据失败', error);
        }
    }
    
    // 从其他系统同步物品
    syncFromOtherSystems() {
        try {
            console.log('背包系统：开始同步其他系统物品');
            
            // 从doll系统同步拐杖
            this.syncFromDollSystem();
            
            // 从grandma系统同步免伤卡
            this.syncFromGrandmaSystem();
            
            // 从mall系统同步购买的物品
            this.syncFromMallSystem();
            
            // 从dice系统同步奖励物品
            this.syncFromDiceSystem();
            
            console.log('背包系统：其他系统物品同步完成');
        } catch (error) {
            console.error('背包系统：同步其他系统物品失败', error);
        }
    }
    
    // 从doll系统同步拐杖
    syncFromDollSystem() {
        try {
            if (!this.currentUser) return;
            
            const userId = this.currentUser.id;
            const savedDolls = localStorage.getItem(`userDolls_${userId}`);
            
            if (savedDolls) {
                const dolls = JSON.parse(savedDolls);
                
                dolls.forEach(doll => {
                    // 计算应得的拐杖数量
                    const canesToEarn = Math.floor(doll.level * 2); // 每级2个拐杖
                    
                    if (canesToEarn > 0) {
                        // 检查是否已存在该拐杖
                        const existingCane = this.backpackData.items.find(item => item.id === 'cane');
                        
                        if (existingCane) {
                            // 增加数量
                            existingCane.count += canesToEarn;
                        } else {
                            // 添加新拐杖
                            this.backpackData.items.push({
                                ...this.itemConfig['cane'],
                                count: canesToEarn,
                                source: 'doll',
                                sourceId: doll.id,
                                obtainTime: new Date().toISOString()
                            });
                        }
                        
                        console.log(`背包系统：从doll系统获得 ${canesToEarn} 个拐杖`);
                    }
                });
            }
        } catch (error) {
            console.error('背包系统：从doll系统同步失败', error);
        }
    }
    
    // 从grandma系统同步免伤卡
    syncFromGrandmaSystem() {
        try {
            if (!this.currentUser) return;
            
            const userId = this.currentUser.id;
            const savedGrandma = localStorage.getItem(`grandma_${userId}`);
            
            if (savedGrandma) {
                const grandmaData = JSON.parse(savedGrandma);
                
                // 检查是否有免伤卡奖励
                if (grandmaData.protectionCards && grandmaData.protectionCards > 0) {
                    const existingProtection = this.backpackData.items.find(item => item.id === 'protection');
                    
                    if (existingProtection) {
                        // 增加数量
                        existingProtection.count += grandmaData.protectionCards;
                    } else {
                        // 添加新免伤卡
                        this.backpackData.items.push({
                            ...this.itemConfig['protection'],
                            count: grandmaData.protectionCards,
                            source: 'grandma',
                            obtainTime: new Date().toISOString()
                        });
                    }
                    
                    console.log(`背包系统：从grandma系统获得 ${grandmaData.protectionCards} 个免伤卡`);
                    
                    // 清空已同步的免伤卡
                    grandmaData.protectionCards = 0;
                    localStorage.setItem(`grandma_${userId}`, JSON.stringify(grandmaData));
                }
            }
        } catch (error) {
            console.error('背包系统：从grandma系统同步失败', error);
        }
    }
    
    // 从mall系统同步购买的物品
    syncFromMallSystem() {
        try {
            if (!this.currentUser) return;
            
            const userId = this.currentUser.id;
            const savedPurchases = localStorage.getItem(`mallPurchases_${userId}`);
            
            if (savedPurchases) {
                const purchases = JSON.parse(savedPurchases);
                
                purchases.forEach(purchase => {
                    if (purchase.status === 'completed' && purchase.itemDelivered) {
                        // 检查是否已存在该物品
                        const existingItem = this.backpackData.items.find(item => item.id === purchase.itemId);
                        
                        if (!existingItem) {
                            const itemConfig = this.itemConfig[purchase.itemId];
                            if (itemConfig) {
                                // 添加购买的物品
                                this.backpackData.items.push({
                                    ...itemConfig,
                                    count: purchase.quantity || 1,
                                    source: 'mall',
                                    sourceId: purchase.id,
                                    purchaseTime: purchase.timestamp,
                                    obtainTime: new Date().toISOString()
                                });
                                
                                console.log(`背包系统：从mall系统获得 ${purchase.itemId} x${purchase.quantity || 1}`);
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('背包系统：从mall系统同步失败', error);
        }
    }
    
    // 从dice系统同步奖励物品
    syncFromDiceSystem() {
        try {
            if (!this.currentUser) return;
            
            const userId = this.currentUser.id;
            const savedDice = localStorage.getItem(`dice_${userId}`);
            
            if (savedDice) {
                const diceData = JSON.parse(savedDice);
                
                // 检查是否有奖励物品
                if (diceData.rewardItems && diceData.rewardItems.length > 0) {
                    diceData.rewardItems.forEach(reward => {
                        if (!reward.delivered) {
                            const itemConfig = this.itemConfig[reward.itemId];
                            if (itemConfig) {
                                // 添加奖励物品
                                this.backpackData.items.push({
                                    ...itemConfig,
                                    count: reward.quantity || 1,
                                    source: 'dice',
                                    sourceId: reward.id,
                                    obtainTime: new Date().toISOString()
                                });
                                
                                console.log(`背包系统：从dice系统获得 ${reward.itemId} x${reward.quantity || 1}`);
                                
                                // 标记为已交付
                                reward.delivered = true;
                            }
                        }
                    });
                    
                    // 保存更新后的dice数据
                    localStorage.setItem(`dice_${userId}`, JSON.stringify(diceData));
                }
            }
        } catch (error) {
            console.error('背包系统：从dice系统同步失败', error);
        }
    }
    
    // 添加物品
    addItem(itemId, count = 1, metadata = {}) {
        try {
            const itemConfig = this.itemConfig[itemId];
            if (!itemConfig) {
                console.error('背包系统：物品配置不存在', itemId);
                return { success: false, error: '物品配置不存在' };
            }
            
            // 检查背包容量
            if (this.backpackData.items.length >= this.backpackData.capacity) {
                return { success: false, error: '背包容量不足' };
            }
            
            // 检查是否已存在该物品
            const existingItem = this.backpackData.items.find(item => item.id === itemId);
            
            if (existingItem) {
                // 检查是否可堆叠
                if (itemConfig.stackable) {
                    // 检查是否超过最大堆叠数
                    const newCount = existingItem.count + count;
                    if (newCount > itemConfig.maxStack) {
                        return { success: false, error: '超过最大堆叠数' };
                    }
                    existingItem.count = newCount;
                } else {
                    return { success: false, error: '该物品不可堆叠' };
                }
            } else {
                // 添加新物品
                const newItem = {
                    ...itemConfig,
                    count: count,
                    obtainTime: new Date().toISOString(),
                    ...metadata
                };
                
                this.backpackData.items.push(newItem);
            }
            
            this.saveBackpackData();
            this.notifyBackpackChange('add', itemId, count, metadata);
            
            return { success: true, item: existingItem || newItem };
        } catch (error) {
            console.error('背包系统：添加物品失败', error);
            return { success: false, error: '添加物品失败' };
        }
    }
    
    // 移除物品
    removeItem(itemId, count = 1) {
        try {
            const itemIndex = this.backpackData.items.findIndex(item => item.id === itemId);
            
            if (itemIndex === -1) {
                return { success: false, error: '物品不存在' };
            }
            
            const item = this.backpackData.items[itemIndex];
            
            if (item.count <= count) {
                // 完全移除
                this.backpackData.items.splice(itemIndex, 1);
            } else {
                // 减少数量
                item.count -= count;
            }
            
            this.saveBackpackData();
            this.notifyBackpackChange('remove', itemId, count);
            
            return { success: true, item: item };
        } catch (error) {
            console.error('背包系统：移除物品失败', error);
            return { success: false, error: '移除物品失败' };
        }
    }
    
    // 使用物品
    useItem(itemId) {
        try {
            const item = this.backpackData.items.find(item => item.id === itemId);
            
            if (!item) {
                return { success: false, error: '物品不存在' };
            }
            
            if (!item.usable) {
                return { success: false, error: '该物品不可使用' };
            }
            
            if (item.count <= 0) {
                return { success: false, error: '物品数量不足' };
            }
            
            // 执行物品效果
            const result = this.executeItemEffect(item);
            
            if (result.success) {
                // 消耗物品
                if (item.consumable) {
                    this.removeItem(itemId, 1);
                }
                
                this.notifyBackpackChange('use', itemId, 1);
            }
            
            return result;
        } catch (error) {
            console.error('背包系统：使用物品失败', error);
            return { success: false, error: '使用物品失败' };
        }
    }
    
    // 执行物品效果
    executeItemEffect(item) {
        try {
            console.log('背包系统：执行物品效果', item.id);
            
            switch (item.id) {
                case 'cane':
                    // 使用拐杖 - 娃娃合成
                    return this.useCane(item);
                    
                case 'protection':
                    // 使用免伤卡 - 恐怖奶奶游戏
                    return this.useProtection(item);
                    
                case 'resurrection':
                    // 使用复活币 - 游戏失败复活
                    return this.useResurrection(item);
                    
                case 'exp_boost':
                    // 使用经验加速卡
                    return this.useExpBoost(item);
                    
                case 'double_points':
                    // 使用双倍积分卡
                    return this.useDoublePoints(item);
                    
                case 'lucky_charm':
                    // 使用幸运符
                    return this.useLuckyCharm(item);
                    
                case 'speed_boost':
                    // 使用加速药水
                    return this.useSpeedBoost(item);
                    
                case 'vip_ticket':
                    // 使用VIP体验卡
                    return this.useVIPTicket(item);
                    
                case 'mystery_box':
                    // 使用神秘盲盒
                    return this.openMysteryBox(item);
                    
                case 'points_voucher':
                    // 使用积分券
                    return this.usePointsVoucher(item);
                    
                case 'premium_token':
                    // 使用高级代币
                    return this.usePremiumToken(item);
                    
                case 'night_vision':
                case 'stealth_boots':
                case 'lucky_amulet':
                case 'experience_ring':
                    // 装备物品
                    return this.equipItem(item);
                    
                case 'golden_skin':
                case 'crystal_skin':
                case 'neon_skin':
                    // 皮肤物品
                    return this.equipSkin(item);
                    
                default:
                    return { success: false, error: '未知物品效果' };
            }
        } catch (error) {
            console.error('背包系统：执行物品效果失败', error);
            return { success: false, error: '执行物品效果失败' };
        }
    }
    
    // 使用拐杖
    useCane(item) {
        try {
            // 检查是否有doll系统
            if (!window.dollSystem) {
                return { success: false, error: '娃娃系统未加载' };
            }
            
            // 调用doll系统的拐杖使用逻辑
            const result = window.dollSystem.useCane();
            
            if (result.success) {
                return { success: true, message: result.message };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('背包系统：使用拐杖失败', error);
            return { success: false, error: '使用拐杖失败' };
        }
    }
    
    // 使用免伤卡
    useProtection(item) {
        try {
            // 检查是否有grandma系统
            if (!window.GrandmaGame) {
                return { success: false, error: '恐怖奶奶游戏未加载' };
            }
            
            // 激活免伤效果
            window.GrandmaGame.gameState.hasProtection = true;
            
            return { success: true, message: '免伤卡已激活，下次被抓将免受损失' };
        } catch (error) {
            console.error('背包系统：使用免伤卡失败', error);
            return { success: false, error: '使用免伤卡失败' };
        }
    }
    
    // 使用复活币
    useResurrection(item) {
        try {
            // 激活复活效果
            localStorage.setItem('resurrectionActive', 'true');
            localStorage.setItem('resurrectionEndTime', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            
            return { success: true, message: '复活币已激活，24小时内游戏失败将自动复活' };
        } catch (error) {
            console.error('背包系统：使用复活币失败', error);
            return { success: false, error: '使用复活币失败' };
        }
    }
    
    // 使用经验加速卡
    useExpBoost(item) {
        try {
            // 激活经验加速效果
            localStorage.setItem('expBoostActive', 'true');
            localStorage.setItem('expBoostEndTime', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            
            return { success: true, message: '经验加速卡已激活，24小时内所有游戏经验值提升50%' };
        } catch (error) {
            console.error('背包系统：使用经验加速卡失败', error);
            return { success: false, error: '使用经验加速卡失败' };
        }
    }
    
    // 使用双倍积分卡
    useDoublePoints(item) {
        try {
            // 激活双倍积分效果
            localStorage.setItem('doublePointsActive', 'true');
            localStorage.setItem('doublePointsEndTime', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
            
            return { success: true, message: '双倍积分卡已激活，7天内所有游戏积分收益翻倍' };
        } catch (error) {
            console.error('背包系统：使用双倍积分卡失败', error);
            return { success: false, error: '使用双倍积分卡失败' };
        }
    }
    
    // 使用幸运符
    useLuckyCharm(item) {
        try {
            // 激活幸运符效果
            localStorage.setItem('luckyCharmActive', 'true');
            localStorage.setItem('luckyCharmEndTime', new Date(Date.now() + 60 * 60 * 1000).toISOString());
            
            return { success: true, message: '幸运符已激活，1小时内获胜概率提升15%' };
        } catch (error) {
            console.error('背包系统：使用幸运符失败', error);
            return { success: false, error: '使用幸运符失败' };
        }
    }
    
    // 使用加速药水
    useSpeedBoost(item) {
        try {
            // 激活加速药水效果
            localStorage.setItem('speedBoostActive', 'true');
            localStorage.setItem('speedBoostEndTime', new Date(Date.now() + 30 * 60 * 1000).toISOString());
            
            return { success: true, message: '加速药水已激活，30分钟内投注锁定时间减少5秒' };
        } catch (error) {
            console.error('背包系统：使用加速药水失败', error);
            return { success: false, error: '使用加速药水失败' };
        }
    }
    
    // 使用VIP体验卡
    useVIPTicket(item) {
        try {
            // 激活VIP体验效果
            localStorage.setItem('vipActive', 'true');
            localStorage.setItem('vipEndTime', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
            
            return { success: true, message: 'VIP体验卡已激活，7天内享受VIP特权' };
        } catch (error) {
            console.error('背包系统：使用VIP体验卡失败', error);
            return { success: false, error: '使用VIP体验卡失败' };
        }
    }
    
    // 使用积分券
    usePointsVoucher(item) {
        try {
            // 兑换积分
            if (window.pointsSystem) {
                const result = window.pointsSystem.addPoints(item.value, '使用积分券');
                
                if (result.success) {
                    return { success: true, message: `成功兑换${item.value}积分` };
                } else {
                    return { success: false, error: result.error };
                }
            } else {
                return { success: false, error: '积分系统未加载' };
            }
        } catch (error) {
            console.error('背包系统：使用积分券失败', error);
            return { success: false, error: '使用积分券失败' };
        }
    }
    
    // 使用高级代币
    usePremiumToken(item) {
        try {
            // 激活高级代币效果
            localStorage.setItem('premiumTokenActive', 'true');
            localStorage.setItem('premiumTokenCount', (parseInt(localStorage.getItem('premiumTokenCount') || 0) + 1).toString());
            
            return { success: true, message: '高级代币已激活，可在高级商店使用' };
        } catch (error) {
            console.error('背包系统：使用高级代币失败', error);
            return { success: false, error: '使用高级代币失败' };
        }
    }
    
    // 装备物品
    equipItem(itemId) {
        try {
            const item = this.backpackData.items.find(item => item.id === itemId);
            
            if (!item || !item.equipEffect) {
                return { success: false, error: '该物品不可装备' };
            }
            
            // 检查是否已装备同类型物品
            const equippedItems = this.backpackData.items.filter(i => 
                i.category === 'equipment' && 
                i.equipEffect && 
                i.equipEffect.game === item.equipEffect.game &&
                i.equipEffect.effect === item.equipEffect.effect
            );
            
            if (equippedItems.length > 0) {
                // 卸下已装备的物品
                equippedItems.forEach(equippedItem => {
                    equippedItem.equipped = false;
                });
            }
            
            // 装备当前物品
            item.equipped = true;
            item.equipTime = new Date().toISOString();
            
            // 应用装备效果
            this.applyEquipEffect(item.equipEffect);
            
            this.saveBackpackData();
            
            return { success: true, message: `${item.name}已装备` };
        } catch (error) {
            console.error('背包系统：装备物品失败', error);
            return { success: false, error: '装备物品失败' };
        }
    }
    
    // 应用装备效果
    applyEquipEffect(equipEffect) {
        try {
            switch (equipEffect.game) {
                case 'grandma':
                    this.applyGrandmaEffect(equipEffect);
                    break;
                case 'all':
                    this.applyGlobalEffect(equipEffect);
                    break;
                default:
                    console.log('背包系统：未知游戏类型', equipEffect.game);
            }
        } catch (error) {
            console.error('背包系统：应用装备效果失败', error);
        }
    }
    
    // 应用恐怖奶奶游戏效果
    applyGrandmaEffect(equipEffect) {
        try {
            if (!window.GrandmaGame) return;
            
            switch (equipEffect.effect) {
                case 'reveal_grandma':
                    window.GrandmaGame.gameState.nightVisionActive = true;
                    break;
                case 'reduce_detection':
                    window.GrandmaGame.gameState.stealthActive = true;
                    break;
                default:
                    console.log('背包系统：未知恐怖奶奶效果', equipEffect.effect);
            }
        } catch (error) {
            console.error('背包系统：应用恐怖奶奶效果失败', error);
        }
    }
    
    // 应用全局效果
    applyGlobalEffect(equipEffect) {
        try {
            switch (equipEffect.effect) {
                case 'luck_bonus':
                    localStorage.setItem('globalLuckBonus', equipEffect.bonus.toString());
                    break;
                case 'exp_bonus':
                    localStorage.setItem('globalExpBonus', equipEffect.bonus.toString());
                    break;
                default:
                    console.log('背包系统：未知全局效果', equipEffect.effect);
            }
        } catch (error) {
            console.error('背包系统：应用全局效果失败', error);
        }
    }
    
    // 装备皮肤
    equipSkin(itemId) {
        try {
            const item = this.backpackData.items.find(item => item.id === itemId);
            
            if (!item || item.category !== 'skin') {
                return { success: false, error: '该物品不是皮肤' };
            }
            
            // 检查是否已装备皮肤
            const equippedSkin = this.backpackData.items.find(i => 
                i.category === 'skin' && i.equipped
            );
            
            if (equippedSkin) {
                // 卸下已装备的皮肤
                equippedSkin.equipped = false;
            }
            
            // 装备当前皮肤
            item.equipped = true;
            item.equipTime = new Date().toISOString();
            
            // 应用皮肤效果
            this.applySkinEffect(item);
            
            this.saveBackpackData();
            
            return { success: true, message: `${item.name}已装备` };
        } catch (error) {
            console.error('背包系统：装备皮肤失败', error);
            return { success: false, error: '装备皮肤失败' };
        }
    }
    
    // 应用皮肤效果
    applySkinEffect(item) {
        try {
            // 保存当前皮肤设置
            localStorage.setItem('currentSkin', JSON.stringify({
                id: item.id,
                name: item.name,
                type: item.skinType,
                applyTo: item.applyTo
            }));
            
            // 触发皮肤变更事件
            const skinChangeEvent = new CustomEvent('skinChanged', {
                detail: {
                    skinId: item.id,
                    skinName: item.name,
                    skinType: item.skinType
                }
            });
            
            window.dispatchEvent(skinChangeEvent);
        } catch (error) {
            console.error('背包系统：应用皮肤效果失败', error);
        }
    }
    
    // 打开神秘盲盒
    openMysteryBox() {
        try {
            const possibleItems = [
                'cane', 'protection', 'resurrection', 'exp_boost', 
                'double_points', 'lucky_charm', 'speed_boost', 
                'vip_ticket', 'points_voucher', 'premium_token'
            ];
            const weights = [15, 5, 10, 15, 8, 5, 10, 12, 3, 15, 7]; // 权重
            const random = Math.random() * 100;
            let cumulative = 0;
            let selectedItem = possibleItems[0];
            
            for (let i = 0; i < possibleItems.length; i++) {
                cumulative += weights[i];
                if (random <= cumulative) {
                    selectedItem = possibleItems[i];
                    break;
                }
            }
            
            const itemConfig = this.itemConfig[selectedItem];
            const newItem = {
                ...itemConfig,
                count: 1,
                source: 'mystery_box',
                obtainTime: new Date().toISOString()
            };
            
            // 添加到背包
            const result = this.addItem(selectedItem, 1, { source: 'mystery_box' });
            
            if (result.success) {
                return { 
                    success: true, 
                    message: `🎁 从神秘盲盒中获得了 ${newItem.name}！`, 
                    item: result.item 
                };
            }
            
            return result;
        } catch (error) {
            console.error('背包系统：打开神秘盲盒失败', error);
            return { success: false, error: '打开神秘盲盒失败' };
        }
    }
    
    // 获取背包物品
    getBackpackItems(category = 'all') {
        try {
            if (category === 'all') {
                return this.backpackData.items;
            }
            
            return this.backpackData.items.filter(item => item.category === category);
        } catch (error) {
            console.error('背包系统：获取背包物品失败', error);
            return [];
        }
    }
    
    // 获取物品数量
    getItemCount(itemId) {
        try {
            const item = this.backpackData.items.find(item => item.id === itemId);
            return item ? item.count : 0;
        } catch (error) {
            console.error('背包系统：获取物品数量失败', error);
            return 0;
        }
    }
    
    // 计算背包总价值
    calculateBackpackValue() {
        try {
            return this.backpackData.items.reduce((total, item) => {
                return total + (item.count * item.value);
            }, 0);
        } catch (error) {
            console.error('背包系统：计算背包总价值失败', error);
            return 0;
        }
    }
    
    // 获取分类名称
    getCategoryName(category) {
        const names = {
            'all': '全部',
            'consumable': '消耗品',
            'equipment': '装备',
            'skin': '皮肤',
            'currency': '货币',
            'special': '特殊'
        };
        return names[category] || category;
    }
    
    // 获取稀有度名称
    getRarityName(rarity) {
        const names = {
            'common': '普通',
            'rare': '稀有',
            'epic': '史诗',
            'legendary': '传说'
        };
        return names[rarity] || rarity;
    }
    
    // 筛选背包分类
    filterBackpackCategory(category) {
        this.backpackData.selectedCategory = category;
        this.notifyBackpackChange('filter', category, null);
    }
    
    // 排序背包物品
    sortBackpackItems(sortBy = 'value') {
        try {
            switch (sortBy) {
                case 'value':
                    this.backpackData.items.sort((a, b) => (b.value * b.count) - (a.value * a.count));
                    break;
                case 'rarity':
                    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
                    this.backpackData.items.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
                    break;
                case 'name':
                    this.backpackData.items.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'time':
                    this.backpackData.items.sort((a, b) => new Date(b.obtainTime) - new Date(a.obtainTime));
                    break;
                default:
                    this.backpackData.items.sort((a, b) => a.id.localeCompare(b.id));
            }
            
            this.saveBackpackData();
            this.notifyBackpackChange('sort', sortBy, null);
        } catch (error) {
            console.error('背包系统：排序背包物品失败', error);
        }
    }
    
    // 整理背包物品
    organizeBackpackItems() {
        try {
            const categories = ['consumable', 'equipment', 'skin', 'currency', 'special'];
            const organizedItems = [];
            
            // 先添加装备品
            const equipmentItems = this.backpackData.items.filter(item => item.category === 'equipment');
            organizedItems.push(...equipmentItems);
            
            // 然后按分类添加其他物品
            categories.forEach(category => {
                if (category !== 'equipment') {
                    const items = this.backpackData.items.filter(item => item.category === category);
                    organizedItems.push(...items);
                }
            });
            
            this.backpackData.items = organizedItems;
            
            this.saveBackpackData();
            this.notifyBackpackChange('organize', null, null);
        } catch (error) {
            console.error('背包系统：整理背包物品失败', error);
        }
    }
    
    // 通知背包变化
    notifyBackpackChange(action, itemId, count, metadata = {}) {
        try {
            // 触发背包变化事件
            const event = new CustomEvent('backpackChange', {
                detail: {
                    action: action,
                    itemId: itemId,
                    count: count,
                    userId: this.currentUser ? this.currentUser.id : null,
                    metadata: metadata
                }
            });
            
            window.dispatchEvent(event);
            
            // 同步到服务器
            this.syncToServer('backpack_change', {
                action: action,
                itemId: itemId,
                count: count,
                userId: this.currentUser ? this.currentUser.id : null,
                timestamp: new Date().toISOString(),
                metadata: metadata
            });
        } catch (error) {
            console.error('背包系统：通知背包变化失败', error);
        }
    }
    
    // 同步到服务器
    async syncToServer(type, data) {
        try {
            console.log('背包系统：准备同步到服务器', type, data);
            
            // 触发数据同步事件
            const syncEvent = new CustomEvent('dataSync', {
                detail: {
                    type: 'backpack',
                    action: type,
                    data: data
                }
            });
            
            window.dispatchEvent(syncEvent);
            
            // 未来这里会调用API服务
            // if (window.apiService) {
            //     await window.apiService.syncBackpack(data);
            // }
        } catch (error) {
            console.error('背包系统：同步到服务器失败', error);
        }
    }
    
    // 初始化事件监听
    initEventListeners() {
        try {
            // 监听用户登录事件
            window.addEventListener('userLoggedIn', (e) => {
                console.log('背包系统：用户登录事件', e.detail);
                this.loadCurrentUser();
                this.loadBackpackData();
            });
            
            // 监听用户登出事件
            window.addEventListener('userLoggedOut', (e) => {
                console.log('背包系统：用户登出事件', e.detail);
                this.currentUser = null;
                this.backpackData = {
                    items: [],
                    capacity: 100,
                    categories: ['all', 'consumable', 'equipment', 'skin', 'currency', 'special'],
                    selectedCategory: 'all'
                };
            });
            
            // 监听积分变动事件
            window.addEventListener('pointsUpdated', (e) => {
                console.log('背包系统：积分变动事件', e.detail);
                // 根据积分变动给予物品奖励
                this.checkPointsRewards(e.detail.oldPoints, e.detail.newPoints);
            });
            
            // 监听游戏结束事件
            window.addEventListener('gameEnded', (e) => {
                console.log('背包系统：游戏结束事件', e.detail);
                // 根据游戏结果给予物品奖励
                this.checkGameRewards(e.detail);
            });
        } catch (error) {
            console.error('背包系统：初始化事件监听失败', error);
        }
    }
    
    // 检查积分奖励
    checkPointsRewards(oldPoints, newPoints) {
        try {
            const pointsDiff = newPoints - oldPoints;
            
            // 每1000积分给予一个神秘盲盒
            if (pointsDiff >= 1000) {
                const boxesCount = Math.floor(pointsDiff / 1000);
                this.addItem('mystery_box', boxesCount, { source: 'points_reward' });
                
                // 触发奖励事件
                const rewardEvent = new CustomEvent('pointsReward', {
                    detail: {
                        type: 'mystery_box',
                        count: boxesCount,
                        pointsDiff: pointsDiff
                    }
                });
                
                window.dispatchEvent(rewardEvent);
            }
        } catch (error) {
            console.error('背包系统：检查积分奖励失败', error);
        }
    }
    
    // 检查游戏奖励
    checkGameRewards(gameData) {
        try {
            // 根据游戏类型和结果给予不同奖励
            switch (gameData.gameType) {
                case 'grandma':
                    this.checkGrandmaRewards(gameData);
                    break;
                case 'dice':
                    this.checkDiceRewards(gameData);
                    break;
                case 'doll':
                    this.checkDollRewards(gameData);
                    break;
                default:
                    console.log('背包系统：未知游戏类型', gameData.gameType);
            }
        } catch (error) {
            console.error('背包系统：检查游戏奖励失败', error);
        }
    }
    
    // 检查恐怖奶奶游戏奖励
    checkGrandmaRewards(gameData) {
        try {
            // 连胜奖励
            if (gameData.winStreak >= 5) {
                this.addItem('lucky_charm', 1, { source: 'grandma_streak' });
            }
            
            // 大额投注奖励
            if (gameData.betAmount >= 500) {
                this.addItem('mystery_box', 1, { source: 'grandma_bet' });
            }
        } catch (error) {
            console.error('背包系统：检查恐怖奶奶游戏奖励失败', error);
        }
    }
    
    // 检查骰子游戏奖励
    checkDiceRewards(gameData) {
        try {
            // 幸运奖励
            if (gameData.isLucky) {
                this.addItem('lucky_charm', 1, { source: 'dice_lucky' });
            }
            
            // 连胜奖励
            if (gameData.winStreak >= 3) {
                this.addItem('mystery_box', 1, { source: 'dice_streak' });
            }
        } catch (error) {
            console.error('背包系统：检查骰子游戏奖励失败', error);
        }
    }
    
    // 检查娃娃游戏奖励
    checkDollRewards(gameData) {
        try {
            // 等级提升奖励
            if (gameData.levelUp) {
                this.addItem('cane', gameData.levelUp, { source: 'doll_levelup' });
            }
            
            // 合成奖励
            if (gameData.crafted) {
                this.addItem('mystery_box', 1, { source: 'doll_craft' });
            }
        } catch (error) {
            console.error('背包系统：检查娃娃游戏奖励失败', error);
        }
    }
}

// 创建全局实例
window.backpackSystem = new BackpackSystem();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackpackSystem;
}
