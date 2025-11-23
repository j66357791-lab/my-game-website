// 家庭乐园前端JavaScript - 实时通知模块
console.log('🔔 实时通知模块加载中...');

// 扩展FamilyPark命名空间 - 实时通知功能
FamilyPark.Realtime = {
    // WebSocket连接状态
    socketConnected: false,
    notificationHistory: [],
    notificationSettings: {
        enableSounds: true,
        enableDesktop: true,
        enablePopup: true,
        maxHistory: 50
    },
    
    // 初始化实时通知
    initRealtimeNotifications() {
        try {
            console.log('🔔 初始化实时通知系统');
            
            // 检查WebSocket连接
            if (!FamilyPark.socket) {
                console.log('❌ WebSocket未连接，尝试重新连接');
                this.reconnectWebSocket();
                return;
            }
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 设置通知权限
            this.setupNotificationPermissions();
            
            // 初始化通知历史
            this.initNotificationHistory();
            
            console.log('✅ 实时通知系统初始化完成');
        } catch (error) {
            console.error('❌ 初始化实时通知系统错误:', error);
        }
    },
    
    // 设置事件监听器
    setupEventListeners() {
        try {
            if (!FamilyPark.socket) return;
            
            // 小鸡喂养事件
            FamilyPark.socket.on('chicken-fed', (data) => {
                this.handleChickenFed(data);
            });
            
            // 协作喂养事件
            FamilyPark.socket.on('cooperative-chicken-fed', (data) => {
                this.handleCooperativeChickenFed(data);
            });
            
            // 鸡蛋产生事件
            FamilyPark.socket.on('new-eggs', (data) => {
                this.handleNewEggs(data);
            });
            
            // 小鸡升级事件
            FamilyPark.socket.on('chicken-leveled-up', (data) => {
                this.handleChickenLeveledUp(data);
            });
            
            // 积分池释放事件
            FamilyPark.socket.on('egg-pool-released', (data) => {
                this.handleEggPoolReleased(data);
            });
            
            // 寿命变化事件
            FamilyPark.socket.on('lifespan-changed', (data) => {
                this.handleLifespanChanged(data);
            });
            
            // 成员在线状态事件
            FamilyPark.socket.on('member-online', (data) => {
                this.handleMemberOnline(data);
            });
            
            // 成员离线状态事件
            FamilyPark.socket.on('member-offline', (data) => {
                this.handleMemberOffline(data);
            });
            
            // 协同领养事件
            FamilyPark.socket.on('cooperative-chicken-adopted', (data) => {
                this.handleCooperativeChickenAdopted(data);
            });
            
            // 鸡蛋收集事件
            FamilyPark.socket.on('eggs-collected', (data) => {
                this.handleEggsCollected(data);
            });
            
            // 养鸡场升级事件
            FamilyPark.socket.on('coop-upgraded', (data) => {
                this.handleCoopUpgraded(data);
            });
            
            // WebSocket连接事件
            FamilyPark.socket.on('connect', () => {
                this.handleSocketConnect();
            });
            
            FamilyPark.socket.on('disconnect', () => {
                this.handleSocketDisconnect();
            });
            
            console.log('✅ 实时通知事件监听器设置完成');
        } catch (error) {
            console.error('❌ 设置事件监听器错误:', error);
        }
    },
    
    // 处理小鸡喂养事件
    handleChickenFed(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'chicken-fed',
                title: '小鸡喂养',
                message: `${data.feederName}喂养了${data.chickenName}，获得${data.growthValue}成长值`,
                data: data,
                timestamp: new Date(),
                priority: 'normal'
            };
            
            // 如果升级了，提高优先级
            if (data.upgraded) {
                notification.title = '小鸡升级！';
                notification.message = `${data.chickenName}升级到${data.newLevel}级！`;
                notification.priority = 'high';
            }
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新相关UI
            this.updateChickenUI(data.chickenId);
        } catch (error) {
            console.error('❌ 处理小鸡喂养事件错误:', error);
        }
    },
    
    // 处理协作喂养事件
    handleCooperativeChickenFed(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'cooperative-feed',
                title: '协作喂养',
                message: `${data.mainFeederName}发起协作喂养，${data.chickenName}获得${data.growthValue}成长值（含${data.bonusGrowth}奖励）`,
                data: data,
                timestamp: new Date(),
                priority: 'high'
            };
            
            // 如果升级了，提高优先级
            if (data.upgraded) {
                notification.title = '协作喂养升级！';
                notification.message = `${data.chickenName}通过协作喂养升级到${data.newLevel}级！`;
                notification.priority = 'critical';
            }
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新相关UI
            this.updateChickenUI(data.chickenId);
        } catch (error) {
            console.error('❌ 处理协作喂养事件错误:', error);
        }
    },
    
    // 处理新鸡蛋事件
    handleNewEggs(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'new-eggs',
                title: '新鸡蛋',
                message: `${data.chickenName}产了${data.eggCount}个鸡蛋！`,
                data: data,
                timestamp: new Date(),
                priority: 'normal'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新鸡蛋统计
            this.updateEggStats();
        } catch (error) {
            console.error('❌ 处理新鸡蛋事件错误:', error);
        }
    },
    
    // 处理小鸡升级事件
    handleChickenLeveledUp(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'chicken-leveled-up',
                title: '小鸡升级',
                message: `恭喜！${data.chickenName}升级到${data.newLevel}级！`,
                data: data,
                timestamp: new Date(),
                priority: 'high'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新小鸡UI
            this.updateChickenUI(data.chickenId);
        } catch (error) {
            console.error('❌ 处理小鸡升级事件错误:', error);
        }
    },
    
    // 处理积分池释放事件
    handleEggPoolReleased(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'egg-pool-released',
                title: '积分池释放',
                message: `积分池释放成功，每位成员获得${data.pointsPerMember}积分`,
                data: data,
                timestamp: new Date(),
                priority: 'high'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新用户积分显示
            FamilyPark.updateUserPoints();
        } catch (error) {
            console.error('❌ 处理积分池释放事件错误:', error);
        }
    },
    
    // 处理寿命变化事件
    handleLifespanChanged(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'lifespan-changed',
                title: '寿命变化',
                message: `小鸡寿命${data.changeType}，当前寿命：${data.newLifespan}天，原因：${data.reason}`,
                data: data,
                timestamp: new Date(),
                priority: data.changeType === '减少' ? 'warning' : 'normal'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新寿命显示
            this.updateLifespanUI(data.chickenId);
        } catch (error) {
            console.error('❌ 处理寿命变化事件错误:', error);
        }
    },
    
    // 处理成员在线事件
    handleMemberOnline(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'member-online',
                title: '成员上线',
                message: `${data.username}上线了`,
                data: data,
                timestamp: new Date(),
                priority: 'low'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新成员在线状态
            this.updateMemberOnlineStatus(data.userId, true);
        } catch (error) {
            console.error('❌ 处理成员在线事件错误:', error);
        }
    },
    
    // 处理成员离线事件
    handleMemberOffline(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'member-offline',
                title: '成员离线',
                message: `${data.username}离线了`,
                data: data,
                timestamp: new Date(),
                priority: 'low'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新成员在线状态
            this.updateMemberOnlineStatus(data.userId, false);
        } catch (error) {
            console.error('❌ 处理成员离线事件错误:', error);
        }
    },
    
    // 处理协同领养事件
    handleCooperativeChickenAdopted(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'cooperative-adopted',
                title: '协同领养',
                message: `${data.invitedBy}邀请${data.targetUsername}成为${data.chickenName}的协作所有者`,
                data: data,
                timestamp: new Date(),
                priority: 'normal'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新协作显示
            this.updateCooperativeUI();
        } catch (error) {
            console.error('❌ 处理协同领养事件错误:', error);
        }
    },
    
    // 处理鸡蛋收集事件
    handleEggsCollected(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'eggs-collected',
                title: '鸡蛋收集',
                message: `${data.collectedBy}收集了${data.totalEggs}个鸡蛋，兑换${data.totalPoints}积分`,
                data: data,
                timestamp: new Date(),
                priority: 'normal'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新鸡蛋统计
            this.updateEggStats();
        } catch (error) {
            console.error('❌ 处理鸡蛋收集事件错误:', error);
        }
    },
    
    // 处理养鸡场升级事件
    handleCoopUpgraded(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: 'coop-upgraded',
                title: '养鸡场升级',
                message: `${data.upgradedBy}将养鸡场升级到${data.newLevel}级，容量：${data.newMaxChickens}只`,
                data: data,
                timestamp: new Date(),
                priority: 'high'
            };
            
            this.showNotification(notification);
            this.addToHistory(notification);
            
            // 更新养鸡场显示
            this.updateCoopUI();
        } catch (error) {
            console.error('❌ 处理养鸡场升级事件错误:', error);
        }
    },
    
    // 处理WebSocket连接事件
    handleSocketConnect() {
        try {
            this.socketConnected = true;
            console.log('✅ WebSocket连接成功');
            
            const notification = {
                id: this.generateNotificationId(),
                type: 'socket-connected',
                title: '连接成功',
                message: '实时通知已连接',
                data: {},
                timestamp: new Date(),
                priority: 'low'
            };
            
            this.showNotification(notification);
            this.updateConnectionStatus(true);
        } catch (error) {
            console.error('❌ 处理WebSocket连接事件错误:', error);
        }
    },
    
    // 处理WebSocket断开事件
    handleSocketDisconnect() {
        try {
            this.socketConnected = false;
            console.log('❌ WebSocket连接断开');
            
            const notification = {
                id: this.generateNotificationId(),
                type: 'socket-disconnected',
                title: '连接断开',
                message: '实时通知连接断开，正在尝试重新连接...',
                data: {},
                timestamp: new Date(),
                priority: 'warning'
            };
            
            this.showNotification(notification);
            this.updateConnectionStatus(false);
            
            // 尝试重新连接
            this.reconnectWebSocket();
        } catch (error) {
            console.error('❌ 处理WebSocket断开事件错误:', error);
        }
    },
    
    // 显示通知
    showNotification(notification) {
        try {
            if (!this.notificationSettings.enablePopup) return;
            
            // 创建通知元素
            const notificationElement = document.createElement('div');
            notificationElement.className = `realtime-notification notification-${notification.priority}`;
            notificationElement.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        <div class="notification-icon">
                            ${this.getNotificationIcon(notification.type)}
                        </div>
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                    </div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-info" onclick="FamilyPark.Realtime.showNotificationDetails('${notification.id}')">
                            详情
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="FamilyPark.Realtime.dismissNotification('${notification.id}')">
                            关闭
                        </button>
                    </div>
                </div>
            `;
            
            // 添加到页面
            const notificationContainer = this.getNotificationContainer();
            notificationContainer.appendChild(notificationElement);
            
            // 播放声音
            if (this.notificationSettings.enableSounds) {
                this.playNotificationSound(notification.priority);
            }
            
            // 桌面通知
            if (this.notificationSettings.enableDesktop) {
                this.showDesktopNotification(notification);
            }
            
            // 自动移除
            const autoRemoveTime = this.getAutoRemoveTime(notification.priority);
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, autoRemoveTime);
        } catch (error) {
            console.error('❌ 显示通知错误:', error);
        }
    },
    
    // 获取通知图标
    getNotificationIcon(type) {
        const iconMap = {
            'chicken-fed': '<i class="fas fa-drumstick-bite"></i>',
            'cooperative-feed': '<i class="fas fa-users"></i>',
            'new-eggs': '<i class="fas fa-egg"></i>',
            'chicken-leveled-up': '<i class="fas fa-arrow-up"></i>',
            'egg-pool-released': '<i class="fas fa-coins"></i>',
            'lifespan-changed': '<i class="fas fa-heartbeat"></i>',
            'member-online': '<i class="fas fa-user-check"></i>',
            'member-offline': '<i class="fas fa-user-times"></i>',
            'cooperative-adopted': '<i class="fas fa-user-plus"></i>',
            'eggs-collected': '<i class="fas fa-basket-shopping"></i>',
            'coop-upgraded': '<i class="fas fa-home"></i>',
            'socket-connected': '<i class="fas fa-wifi"></i>',
            'socket-disconnected': '<i class="fas fa-wifi-slash"></i>'
        };
        
        return iconMap[type] || '<i class="fas fa-bell"></i>';
    },
    
    // 获取通知容器
    getNotificationContainer() {
        let container = document.getElementById('realtime-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'realtime-notifications';
            container.className = 'realtime-notifications';
            document.body.appendChild(container);
        }
        return container;
    },
    
    // 播放通知声音
    playNotificationSound(priority) {
        try {
            if (!this.notificationSettings.enableSounds) return;
            
            const audio = new Audio();
            const soundMap = {
                'critical': '/sounds/notification-critical.mp3',
                'high': '/sounds/notification-high.mp3',
                'normal': '/sounds/notification-normal.mp3',
                'low': '/sounds/notification-low.mp3',
                'warning': '/sounds/notification-warning.mp3'
            };
            
            audio.src = soundMap[priority] || soundMap['normal'];
            audio.volume = 0.3;
            audio.play().catch(error => {
                console.log('🔕 播放通知声音失败:', error);
            });
        } catch (error) {
            console.error('❌ 播放通知声音错误:', error);
        }
    },
    
    // 显示桌面通知
    showDesktopNotification(notification) {
        try {
            if (!this.notificationSettings.enableDesktop) return;
            
            if (!('Notification' in window)) return;
            
            if (Notification.permission === 'granted') {
                const desktopNotification = new Notification(notification.title, {
                    body: notification.message,
                    icon: '/images/logo.png',
                    tag: notification.id,
                    requireInteraction: notification.priority === 'critical'
                });
                
                desktopNotification.onclick = () => {
                    this.showNotificationDetails(notification.id);
                    desktopNotification.close();
                };
                
                // 自动关闭
                const autoCloseTime = this.getAutoRemoveTime(notification.priority);
                setTimeout(() => {
                    desktopNotification.close();
                }, autoCloseTime);
            }
        } catch (error) {
            console.error('❌ 显示桌面通知错误:', error);
        }
    },
    
    // 获取自动移除时间
    getAutoRemoveTime(priority) {
        const timeMap = {
            'critical': 10000,  // 10秒
            'high': 8000,      // 8秒
            'normal': 5000,    // 5秒
            'low': 3000,       // 3秒
            'warning': 7000    // 7秒
        };
        
        return timeMap[priority] || 5000;
    },
    
    // 格式化时间
    formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) { // 小于1分钟
                return '刚刚';
            } else if (diff < 3600000) { // 小于1小时
                return `${Math.floor(diff / 60000)}分钟前`;
            } else if (diff < 86400000) { // 小于1天
                return `${Math.floor(diff / 3600000)}小时前`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return '未知时间';
        }
    },
    
    // 添加到历史记录
    addToHistory(notification) {
        try {
            this.notificationHistory.unshift(notification);
            
            // 限制历史记录数量
            if (this.notificationHistory.length > this.notificationSettings.maxHistory) {
                this.notificationHistory = this.notificationHistory.slice(0, this.notificationSettings.maxHistory);
            }
            
            // 更新历史显示
            this.updateHistoryDisplay();
        } catch (error) {
            console.error('❌ 添加到历史记录错误:', error);
        }
    },
    
    // 更新历史显示
    updateHistoryDisplay() {
        try {
            const historyContainer = document.getElementById('notification-history');
            if (!historyContainer) return;
            
            if (this.notificationHistory.length === 0) {
                historyContainer.innerHTML = '<p class="no-history">暂无通知历史</p>';
                return;
            }
            
            historyContainer.innerHTML = `
                <h4>通知历史</h4>
                <div class="history-list">
                    ${this.notificationHistory.slice(0, 20).map(notification => `
                        <div class="history-item ${notification.priority}" onclick="FamilyPark.Realtime.showNotificationDetails('${notification.id}')">
                            <div class="history-header">
                                <div class="history-icon">
                                    ${this.getNotificationIcon(notification.type)}
                                </div>
                                <div class="history-title">${notification.title}</div>
                                <div class="history-time">${this.formatTime(notification.timestamp)}</div>
                            </div>
                            <div class="history-message">${notification.message}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新历史显示错误:', error);
        }
    },
    
    // 显示通知详情
    showNotificationDetails(notificationId) {
        try {
            const notification = this.notificationHistory.find(n => n.id === notificationId);
            if (!notification) return;
            
            const modalHtml = `
                <div id="notification-details-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                ${this.getNotificationIcon(notification.type)}
                                通知详情 - ${notification.title}
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('notification-details-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="notification-details">
                                <div class="detail-item">
                                    <span class="label">类型:</span>
                                    <span class="value">${notification.type}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">优先级:</span>
                                    <span class="value ${notification.priority}">${notification.priority}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">时间:</span>
                                    <span class="value">${new Date(notification.timestamp).toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">消息:</span>
                                    <span class="value">${notification.message}</span>
                                </div>
                                ${notification.data ? `
                                    <div class="detail-item">
                                        <span class="label">详细数据:</span>
                                        <pre class="data-display">${JSON.stringify(notification.data, null, 2)}</pre>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('notification-details-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示通知详情错误:', error);
        }
    },
    
    // 关闭通知
    dismissNotification(notificationId) {
        try {
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.remove();
            }
        } catch (error) {
            console.error('❌ 关闭通知错误:', error);
        }
    },
    
    // 设置通知权限
    setupNotificationPermissions() {
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                // 请求桌面通知权限
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('✅ 桌面通知权限已授权');
                    } else {
                        console.log('🔕 桌面通知权限被拒绝');
                    }
                });
            }
        } catch (error) {
            console.error('❌ 设置通知权限错误:', error);
        }
    },
    
    // 初始化通知历史
    initNotificationHistory() {
        try {
            // 从localStorage加载历史记录
            const savedHistory = localStorage.getItem('notificationHistory');
            if (savedHistory) {
                this.notificationHistory = JSON.parse(savedHistory);
            }
            
            // 创建历史面板
            this.createHistoryPanel();
            
            // 更新显示
            this.updateHistoryDisplay();
        } catch (error) {
            console.error('❌ 初始化通知历史错误:', error);
        }
    },
    
    // 创建历史面板
    createHistoryPanel() {
        try {
            const navLinks = document.querySelector('.nav-links');
            if (!navLinks) return;
            
            // 检查是否已存在
            const existingPanel = document.querySelector('[data-panel="notifications"]');
            if (existingPanel) return;
            
            // 添加导航链接
            const notificationLink = document.createElement('li');
            notificationLink.innerHTML = '<a href="#" class="nav-link" data-panel="notifications">通知中心</a>';
            navLinks.appendChild(notificationLink);
            
            // 添加面板
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            const notificationPanel = document.createElement('div');
            notificationPanel.id = 'notifications';
            notificationPanel.className = 'panel';
            notificationPanel.innerHTML = `
                <h1>通知中心</h1>
                
                <div class="notification-settings">
                    <h3>通知设置</h3>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="enable-sounds" ${this.notificationSettings.enableSounds ? 'checked' : ''}>
                                启用声音
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="enable-desktop" ${this.notificationSettings.enableDesktop ? 'checked' : ''}>
                                启用桌面通知
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="enable-popup" ${this.notificationSettings.enablePopup ? 'checked' : ''}>
                                启用弹窗通知
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-label">
                                最大历史记录数:
                                <input type="number" id="max-history" value="${this.notificationSettings.maxHistory}" min="10" max="100">
                            </label>
                        </div>
                    </div>
                    <div class="settings-actions">
                        <button class="btn btn-primary" onclick="FamilyPark.Realtime.saveNotificationSettings()">
                            <i class="fas fa-save"></i> 保存设置
                        </button>
                        <button class="btn btn-danger" onclick="FamilyPark.Realtime.clearNotificationHistory()">
                            <i class="fas fa-trash"></i> 清除历史
                        </button>
                    </div>
                </div>
                
                <div class="connection-status" id="connection-status">
                    <h3>连接状态</h3>
                    <div class="status-info">
                        <div class="status-item">
                            <span class="label">WebSocket:</span>
                            <span class="value ${this.socketConnected ? 'connected' : 'disconnected'}">
                                ${this.socketConnected ? '已连接' : '未连接'}
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="label">通知数量:</span>
                            <span class="value">${this.notificationHistory.length}</span>
                        </div>
                    </div>
                </div>
                
                <div class="notification-history" id="notification-history">
                    <h3>通知历史</h3>
                    <p>加载中...</p>
                </div>
            `;
            
            mainContent.appendChild(notificationPanel);
            
            // 绑定设置事件
            this.bindSettingsEvents();
        } catch (error) {
            console.error('❌ 创建历史面板错误:', error);
        }
    },
    
    // 绑定设置事件
    bindSettingsEvents() {
        try {
            const enableSounds = document.getElementById('enable-sounds');
            const enableDesktop = document.getElementById('enable-desktop');
            const enablePopup = document.getElementById('enable-popup');
            const maxHistory = document.getElementById('max-history');
            
            if (enableSounds) {
                enableSounds.addEventListener('change', (e) => {
                    this.notificationSettings.enableSounds = e.target.checked;
                });
            }
            
            if (enableDesktop) {
                enableDesktop.addEventListener('change', (e) => {
                    this.notificationSettings.enableDesktop = e.target.checked;
                });
            }
            
            if (enablePopup) {
                enablePopup.addEventListener('change', (e) => {
                    this.notificationSettings.enablePopup = e.target.checked;
                });
            }
            
            if (maxHistory) {
                maxHistory.addEventListener('change', (e) => {
                    this.notificationSettings.maxHistory = parseInt(e.target.value);
                });
            }
        } catch (error) {
            console.error('❌ 绑定设置事件错误:', error);
        }
    },
    
    // 保存通知设置
    saveNotificationSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
            FamilyPark.showNotification('通知设置已保存', 'success');
        } catch (error) {
            console.error('❌ 保存通知设置错误:', error);
            FamilyPark.showNotification('保存设置失败', 'error');
        }
    },
    
    // 清除通知历史
    clearNotificationHistory() {
        try {
            if (!confirm('确定要清除所有通知历史吗？')) return;
            
            this.notificationHistory = [];
            localStorage.removeItem('notificationHistory');
            this.updateHistoryDisplay();
            FamilyPark.showNotification('通知历史已清除', 'success');
        } catch (error) {
            console.error('❌ 清除通知历史错误:', error);
            FamilyPark.showNotification('清除历史失败', 'error');
        }
    },
    
    // 更新连接状态
    updateConnectionStatus(connected) {
        try {
            const statusElement = document.getElementById('connection-status');
            if (!statusElement) return;
            
            const statusInfo = statusElement.querySelector('.status-info');
            if (statusInfo) {
                const websocketStatus = statusInfo.querySelector('.value');
                if (websocketStatus) {
                    websocketStatus.className = `value ${connected ? 'connected' : 'disconnected'}`;
                    websocketStatus.textContent = connected ? '已连接' : '未连接';
                }
            }
        } catch (error) {
            console.error('❌ 更新连接状态错误:', error);
        }
    },
    
    // 更新小鸡UI
    updateChickenUI(chickenId) {
        try {
            // 这里可以更新小鸡相关的UI
            // 例如：重新加载养鸡场数据
            if (FamilyPark.ChickenCoop) {
                FamilyPark.ChickenCoop.loadChickenCoopData();
            }
        } catch (error) {
            console.error('❌ 更新小鸡UI错误:', error);
        }
    },
    
    // 更新鸡蛋统计
    updateEggStats() {
        try {
            // 这里可以更新鸡蛋相关的统计
            // 例如：重新加载鸡蛋仓库数据
            if (FamilyPark.EggStorage) {
                FamilyPark.EggStorage.loadEggStorageData();
            }
        } catch (error) {
            console.error('❌ 更新鸡蛋统计错误:', error);
        }
    },
    
    // 更新寿命UI
    updateLifespanUI(chickenId) {
        try {
            // 这里可以更新寿命相关的UI
            // 例如：重新加载寿命数据
            if (FamilyPark.Lifespan) {
                FamilyPark.Lifespan.loadChickenLifespanReport(chickenId);
            }
        } catch (error) {
            console.error('❌ 更新寿命UI错误:', error);
        }
    },
    
    // 更新成员在线状态
    updateMemberOnlineStatus(userId, online) {
        try {
            // 这里可以更新成员在线状态显示
            // 例如：更新家庭成员列表中的在线状态
            const memberElements = document.querySelectorAll(`[data-user-id="${userId}"]`);
            memberElements.forEach(element => {
                const statusElement = element.querySelector('.online-status');
                if (statusElement) {
                    statusElement.className = `online-status ${online ? 'online' : 'offline'}`;
                    statusElement.textContent = online ? '在线' : '离线';
                }
            });
        } catch (error) {
            console.error('❌ 更新成员在线状态错误:', error);
        }
    },
    
    // 更新协作UI
    updateCooperativeUI() {
        try {
            // 这里可以更新协作相关的UI
            // 例如：重新加载协作数据
            if (FamilyPark.Cooperative) {
                FamilyPark.Cooperative.loadCooperativeChickens();
            }
        } catch (error) {
            console.error('❌ 更新协作UI错误:', error);
        }
    },
    
    // 更新养鸡场UI
    updateCoopUI() {
        try {
            // 这里可以更新养鸡场相关的UI
            // 例如：重新加载家庭数据
            if (FamilyPark.loadFamilyData) {
                FamilyPark.loadFamilyData();
            }
        } catch (error) {
            console.error('❌ 更新养鸡场UI错误:', error);
        }
    },
    
    // 重新连接WebSocket
    reconnectWebSocket() {
        try {
            console.log('🔄 尝试重新连接WebSocket...');
            
            // 这里可以添加重新连接逻辑
            // 例如：重新初始化WebSocket连接
            setTimeout(() => {
                if (!this.socketConnected && FamilyPark.initWebSocket) {
                    FamilyPark.initWebSocket();
                }
            }, 5000);
        } catch (error) {
            console.error('❌ 重新连接WebSocket错误:', error);
        }
    },
    
    // 生成通知ID
    generateNotificationId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

console.log('🔔 实时通知模块加载完成');
