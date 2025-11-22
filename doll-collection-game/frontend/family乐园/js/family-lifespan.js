// 家庭乐园前端JavaScript - 寿命管理模块
console.log('🔬 寿命管理模块加载中...');

// 扩展FamilyPark命名空间 - 寿命管理功能
FamilyPark.Lifespan = {
    // 当前寿命数据
    currentLifespanData: {},
    
    // 加载小鸡寿命报告
    async loadChickenLifespanReport(chickenId) {
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/chicken/lifespan-report/${chickenId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentLifespanData[chickenId] = data.report;
                this.updateLifespanDisplay(chickenId, data.report);
            }
        } catch (error) {
            console.error('❌ 加载小鸡寿命报告错误:', error);
        }
    },
    
    // 加载所有小鸡的寿命状态
    async loadAllLifespanStatus() {
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/chicken/lifespan-status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateAllLifespanDisplay(data.chickens);
            }
        } catch (error) {
            console.error('❌ 加载所有小鸡寿命状态错误:', error);
        }
    },
    
    // 更新单只小鸡寿命显示
    updateLifespanDisplay(chickenId, report) {
        try {
            console.log('🔬 更新小鸡寿命显示:', chickenId);
            
            const lifespanInfo = document.getElementById(`lifespan-info-${chickenId}`);
            const lifespanBar = document.getElementById(`lifespan-bar-${chickenId}`);
            const lifespanStatus = document.getElementById(`lifespan-status-${chickenId}`);
            
            if (!report) return;
            
            if (lifespanInfo) {
                lifespanInfo.innerHTML = `
                    <div class="lifespan-detail">
                        <span class="label">当前寿命:</span>
                        <span class="value ${this.getLifespanClass(report.lifespanPercentage)}">
                            ${report.currentLifespan}天
                        </span>
                    </div>
                    <div class="lifespan-detail">
                        <span class="label">最大寿命:</span>
                        <span class="value">${report.maxLifespan}天</span>
                    </div>
                    <div class="lifespan-detail">
                        <span class="label">寿命百分比:</span>
                        <span class="value">${report.lifespanPercentage}%</span>
                    </div>
                    <div class="lifespan-detail">
                        <span class="label">健康状况:</span>
                        <span class="value ${report.healthStatus ? 'healthy' : 'unhealthy'}">
                            ${report.healthStatus ? '健康' : '需要关注'}
                        </span>
                    </div>
                    <div class="lifespan-detail">
                        <span class="label">最后喂养:</span>
                        <span class="value">${new Date(report.lastFeedDate).toLocaleDateString()}</span>
                    </div>
                `;
            }
            
            if (lifespanBar) {
                lifespanBar.innerHTML = `
                    <div class="lifespan-progress">
                        <div class="lifespan-fill ${this.getLifespanClass(report.lifespanPercentage)}" 
                             style="width: ${report.lifespanPercentage}%"></div>
                    </div>
                    <div class="lifespan-text">
                        <span>${report.currentLifespan} / ${report.maxLifespan} 天</span>
                        <span>${report.lifespanPercentage}%</span>
                    </div>
                `;
            }
            
            if (lifespanStatus) {
                lifespanStatus.innerHTML = `
                    <div class="status-indicator ${report.active ? 'active' : 'inactive'}">
                        <i class="fas ${report.active ? 'fa-heart' : 'fa-heart-broken'}"></i>
                        <span>${report.active ? '存活' : '已死亡'}</span>
                    </div>
                    ${report.deathDate ? `
                        <div class="death-date">
                            死亡时间: ${new Date(report.deathDate).toLocaleString()}
                        </div>
                    ` : ''}
                `;
            }
        } catch (error) {
            console.error('❌ 更新小鸡寿命显示错误:', error);
        }
    },
    
    // 更新所有小鸡寿命显示
    updateAllLifespanDisplay(chickens) {
        try {
            console.log('🔬 更新所有小鸡寿命显示');
            
            const lifespanOverview = document.getElementById('lifespan-overview');
            if (!lifespanOverview) return;
            
            if (!chickens || chickens.length === 0) {
                lifespanOverview.innerHTML = '<p>暂无小鸡寿命数据</p>';
                return;
            }
            
            // 计算统计数据
            const stats = this.calculateLifespanStats(chickens);
            
            lifespanOverview.innerHTML = `
                <div class="lifespan-stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">小鸡总数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${stats.activeClass}">${stats.active}</div>
                        <div class="stat-label">存活小鸡</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${stats.deceasedClass}">${stats.deceased}</div>
                        <div class="stat-label">已死亡小鸡</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value ${stats.avgLifespanClass}">${stats.avgLifespan}</div>
                        <div class="stat-label">平均寿命</div>
                    </div>
                </div>
                
                <div class="lifespan-list">
                    <h3>小鸡寿命详情</h3>
                    <div class="chicken-lifespan-grid">
                        ${chickens.map(chicken => this.createLifespanCard(chicken)).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新所有小鸡寿命显示错误:', error);
        }
    },
    
    // 创建寿命卡片
    createLifespanCard(chicken) {
        try {
            const lifespanClass = this.getLifespanClass(chicken.lifespanPercentage);
            const healthClass = chicken.healthStatus ? 'healthy' : 'unhealthy';
            
            return `
                <div class="lifespan-card ${chicken.active ? 'active' : 'deceased'}">
                    <div class="card-header ${lifespanClass}">
                        <h4>${chicken.name}</h4>
                        <div class="chicken-level">Lv.${chicken.level}</div>
                        <div class="chicken-quality">${chicken.quality}</div>
                    </div>
                    <div class="card-body">
                        <div class="lifespan-progress">
                            <div class="lifespan-fill ${lifespanClass}" 
                                 style="width: ${chicken.lifespanPercentage}%"></div>
                        </div>
                        <div class="lifespan-info">
                            <div class="lifespan-days">
                                <span class="current">${chicken.currentLifespan}</span>
                                <span class="separator">/</span>
                                <span class="max">${chicken.maxLifespan}</span>
                                <span class="unit">天</span>
                            </div>
                            <div class="lifespan-percentage">${chicken.lifespanPercentage}%</div>
                        </div>
                        <div class="health-status ${healthClass}">
                            <i class="fas ${chicken.healthStatus ? 'fa-heart' : 'fa-heart-broken'}"></i>
                            <span>${chicken.healthStatus ? '健康' : '需要关注'}</span>
                        </div>
                        <div class="last-feed">
                            <i class="fas fa-clock"></i>
                            最后喂养: ${new Date(chicken.lastFeedDate).toLocaleDateString()}
                        </div>
                        <div class="lifespan-actions">
                            <button class="btn btn-sm btn-info" onclick="FamilyPark.Lifespan.showLifespanDetails('${chicken.chickenId}')">
                                <i class="fas fa-info-circle"></i> 详情
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="FamilyPark.Lifespan.showLifespanRecommendations('${chicken.chickenId}')">
                                <i class="fas fa-lightbulb"></i> 建议
                            </button>
                            ${FamilyPark.currentUser.role === 'admin' ? `
                                <button class="btn btn-sm btn-danger" onclick="FamilyPark.Lifespan.showAdjustLifespanModal('${chicken.chickenId}')">
                                    <i class="fas fa-edit"></i> 调整
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 创建寿命卡片错误:', error);
            return '<div class="lifespan-card error">创建卡片失败</div>';
        }
    },
    
    // 计算寿命统计
    calculateLifespanStats(chickens) {
        try {
            const stats = {
                total: chickens.length,
                active: 0,
                deceased: 0,
                avgLifespan: 0,
                activeClass: '',
                deceasedClass: '',
                avgLifespanClass: ''
            };
            
            let totalLifespan = 0;
            
            chickens.forEach(chicken => {
                if (chicken.active) {
                    stats.active++;
                } else {
                    stats.deceased++;
                }
                totalLifespan += chicken.currentLifespan;
            });
            
            stats.avgLifespan = Math.round(totalLifespan / chickens.length);
            
            // 设置样式类
            if (stats.active === 0) {
                stats.activeClass = 'danger';
            } else if (stats.active < chickens.length * 0.5) {
                stats.activeClass = 'warning';
            } else {
                stats.activeClass = 'success';
            }
            
            if (stats.deceased > 0) {
                stats.deceasedClass = 'danger';
            }
            
            if (stats.avgLifespan < 30) {
                stats.avgLifespanClass = 'danger';
            } else if (stats.avgLifespan < 90) {
                stats.avgLifespanClass = 'warning';
            } else {
                stats.avgLifespanClass = 'success';
            }
            
            return stats;
        } catch (error) {
            console.error('❌ 计算寿命统计错误:', error);
            return {
                total: 0,
                active: 0,
                deceased: 0,
                avgLifespan: 0,
                activeClass: '',
                deceasedClass: '',
                avgLifespanClass: ''
            };
        }
    },
    
    // 获取寿命样式类
    getLifespanClass(percentage) {
        if (percentage >= 80) {
            return 'excellent';
        } else if (percentage >= 60) {
            return 'good';
        } else if (percentage >= 40) {
            return 'warning';
        } else if (percentage >= 20) {
            return 'danger';
        } else {
            return 'critical';
        }
    },
    
    // 显示寿命详情
    showLifespanDetails(chickenId) {
        try {
            const report = this.currentLifespanData[chickenId];
            if (!report) {
                FamilyPark.showNotification('寿命数据加载中，请稍后重试', 'warning');
                return;
            }
            
            const modalHtml = `
                <div id="lifespan-details-modal" class="modal" style="display: flex;">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-heartbeat"></i>
                                ${report.name} - 寿命详情
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('lifespan-details-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="lifespan-overview">
                                <div class="overview-card ${this.getLifespanClass(report.lifespanPercentage)}">
                                    <div class="overview-header">
                                        <h4>${report.name}</h4>
                                        <div class="chicken-meta">
                                            <span class="level">Lv.${report.level}</span>
                                            <span class="quality">${report.quality}</span>
                                            <span class="status ${report.active ? 'active' : 'inactive'}">
                                                ${report.active ? '存活' : '已死亡'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="overview-stats">
                                        <div class="stat-item">
                                            <span class="label">当前寿命</span>
                                            <span class="value">${report.currentLifespan}天</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">最大寿命</span>
                                            <span class="value">${report.maxLifespan}天</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">寿命百分比</span>
                                            <span class="value">${report.lifespanPercentage}%</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">健康状况</span>
                                            <span class="value ${report.healthStatus ? 'healthy' : 'unhealthy'}">
                                                ${report.healthStatus ? '健康' : '需要关注'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="lifespan-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill ${this.getLifespanClass(report.lifespanPercentage)}" 
                                                 style="width: ${report.lifespanPercentage}%"></div>
                                        </div>
                                        <div class="progress-text">
                                            <span>${report.currentLifespan} / ${report.maxLifespan} 天</span>
                                            <span>${report.lifespanPercentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="lifespan-history">
                                <h4>寿命变化历史</h4>
                                <div class="history-tabs">
                                    <div class="history-tab active" onclick="FamilyPark.Lifespan.switchHistoryTab('reductions')">寿命减少</div>
                                    <div class="history-tab" onclick="FamilyPark.Lifespan.switchHistoryTab('extensions')">寿命延长</div>
                                </div>
                                <div class="history-content">
                                    <div id="reductions-history" class="history-panel active">
                                        ${this.createReductionsHistory(report.lifespanReductions)}
                                    </div>
                                    <div id="extensions-history" class="history-panel">
                                        ${this.createExtensionsHistory(report.lifespanExtensions)}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="lifespan-timeline">
                                <h4>重要时间节点</h4>
                                <div class="timeline">
                                    ${this.createTimeline(report)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('lifespan-details-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示寿命详情错误:', error);
        }
    },
    
    // 创建寿命减少历史
    createReductionsHistory(reductions) {
        try {
            if (!reductions || reductions.length === 0) {
                return '<p>暂无寿命减少记录</p>';
            }
            
            return `
                <div class="history-list">
                    ${reductions.map(reduction => `
                        <div class="history-item reduction">
                            <div class="history-date">
                                <i class="fas fa-calendar"></i>
                                ${new Date(reduction.date).toLocaleString()}
                            </div>
                            <div class="history-details">
                                <div class="history-reason">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    ${reduction.reason}
                                </div>
                                <div class="history-amount">
                                    <span class="label">减少天数:</span>
                                    <span class="value danger">${reduction.daysReduced}天</span>
                                </div>
                                ${reduction.reducedBy ? `
                                    <div class="history-operator">
                                        <span class="label">操作者:</span>
                                        <span class="value">${reduction.reducedBy.username || '系统'}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 创建寿命减少历史错误:', error);
            return '<p>创建历史记录失败</p>';
        }
    },
    
    // 创建寿命延长历史
    createExtensionsHistory(extensions) {
        try {
            if (!extensions || extensions.length === 0) {
                return '<p>暂无寿命延长记录</p>';
            }
            
            return `
                <div class="history-list">
                    ${extensions.map(extension => `
                        <div class="history-item extension">
                            <div class="history-date">
                                <i class="fas fa-calendar"></i>
                                ${new Date(extension.date).toLocaleString()}
                            </div>
                            <div class="history-details">
                                <div class="history-reason">
                                    <i class="fas fa-plus-circle"></i>
                                    ${extension.reason}
                                </div>
                                <div class="history-amount">
                                    <span class="label">延长天数:</span>
                                    <span class="value success">${extension.daysExtended}天</span>
                                </div>
                                ${extension.extendedBy ? `
                                    <div class="history-operator">
                                        <span class="label">操作者:</span>
                                        <span class="value">${extension.extendedBy.username || '系统'}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 创建寿命延长历史错误:', error);
            return '<p>创建历史记录失败</p>';
        }
    },
    
    // 创建时间线
    createTimeline(report) {
        try {
            const timeline = [];
            
            // 添加创建时间
            timeline.push({
                date: new Date(), // 这里应该是实际的创建时间
                type: 'creation',
                title: '小鸡创建',
                description: `${report.name}诞生了`,
                icon: 'fa-egg'
            });
            
            // 添加寿命减少事件
            if (report.lifespanReductions) {
                report.lifespanReductions.forEach(reduction => {
                    timeline.push({
                        date: new Date(reduction.date),
                        type: 'reduction',
                        title: '寿命减少',
                        description: `因${reduction.reason}减少${reduction.daysReduced}天寿命`,
                        icon: 'fa-minus-circle'
                    });
                });
            }
            
            // 添加寿命延长事件
            if (report.lifespanExtensions) {
                report.lifespanExtensions.forEach(extension => {
                    timeline.push({
                        date: new Date(extension.date),
                        type: 'extension',
                        title: '寿命延长',
                        description: `因${extension.reason}延长${extension.daysExtended}天寿命`,
                        icon: 'fa-plus-circle'
                    });
                });
            }
            
            // 按时间排序
            timeline.sort((a, b) => b.date - a.date);
            
            return `
                <div class="timeline-list">
                    ${timeline.map((item, index) => `
                        <div class="timeline-item ${item.type}">
                            <div class="timeline-marker">
                                <i class="fas ${item.icon}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-date">
                                    ${item.date.toLocaleString()}
                                </div>
                                <div class="timeline-title">
                                    ${item.title}
                                </div>
                                <div class="timeline-description">
                                    ${item.description}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 创建时间线错误:', error);
            return '<p>创建时间线失败</p>';
        }
    },
    
    // 显示寿命建议
    showLifespanRecommendations(chickenId) {
        try {
            const report = this.currentLifespanData[chickenId];
            if (!report) {
                FamilyPark.showNotification('寿命数据加载中，请稍后重试', 'warning');
                return;
            }
            
            const modalHtml = `
                <div id="lifespan-recommendations-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-lightbulb"></i>
                                ${report.name} - 寿命管理建议
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('lifespan-recommendations-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="lifespan-summary">
                                <div class="summary-card ${this.getLifespanClass(report.lifespanPercentage)}">
                                    <h4>当前状态</h4>
                                    <div class="summary-stats">
                                        <div class="summary-stat">
                                            <span class="label">寿命状态</span>
                                            <span class="value">${report.lifespanPercentage}%</span>
                                        </div>
                                        <div class="summary-stat">
                                            <span class="label">剩余天数</span>
                                            <span class="value">${report.currentLifespan}天</span>
                                        </div>
                                        <div class="summary-stat">
                                            <span class="label">健康状况</span>
                                            <span class="value ${report.healthStatus ? 'healthy' : 'unhealthy'}">
                                                ${report.healthStatus ? '健康' : '需要关注'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="recommendations">
                                <h4>管理建议</h4>
                                <div class="recommendations-list">
                                    ${this.generateRecommendations(report)}
                                </div>
                            </div>
                            
                            <div class="care-tips">
                                <h4>护理技巧</h4>
                                <div class="tips-list">
                                    ${this.generateCareTips(report)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('lifespan-recommendations-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示寿命建议错误:', error);
        }
    },
    
    // 生成建议
    generateRecommendations(report) {
        try {
            const recommendations = [];
            
            // 基于寿命百分比的建议
            if (report.lifespanPercentage < 30) {
                recommendations.push({
                    type: 'critical',
                    icon: 'fa-exclamation-triangle',
                    title: '寿命过低',
                    description: '小鸡寿命严重不足，需要立即采取行动'
                });
            } else if (report.lifespanPercentage < 60) {
                recommendations.push({
                    type: 'warning',
                    icon: 'fa-exclamation-circle',
                    title: '寿命偏低',
                    description: '小鸡寿命偏低，建议增加喂养频率'
                });
            }
            
            // 基于健康状况的建议
            if (!report.healthStatus) {
                recommendations.push({
                    type: 'danger',
                    icon: 'fa-heart-broken',
                    title: '健康状况不佳',
                    description: '小鸡健康状况不佳，建议立即喂养'
                });
            }
            
            // 基于最后喂养时间的建议
            const daysSinceLastFeed = Math.floor((new Date() - new Date(report.lastFeedDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceLastFeed > 3) {
                recommendations.push({
                    type: 'warning',
                    icon: 'fa-clock',
                    title: '喂养间隔过长',
                    description: `已${daysSinceLastFeed}天未喂养，建议立即喂养`
                });
            }
            
            // 基于等级的建议
            if (report.level >= 3 && report.lifespanPercentage < 80) {
                recommendations.push({
                    type: 'info',
                    icon: 'fa-star',
                    title: '高级小鸡护理',
                    description: '高级小鸡需要更多关注，建议定期检查健康状况'
                });
            }
            
            if (recommendations.length === 0) {
                recommendations.push({
                    type: 'success',
                    icon: 'fa-check-circle',
                    title: '状态良好',
                    description: '小鸡状态良好，继续保持当前的护理方式'
                });
            }
            
            return recommendations.map(rec => `
                <div class="recommendation-item ${rec.type}">
                    <div class="recommendation-icon">
                        <i class="fas ${rec.icon}"></i>
                    </div>
                    <div class="recommendation-content">
                        <div class="recommendation-title">${rec.title}</div>
                        <div class="recommendation-description">${rec.description}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('❌ 生成建议错误:', error);
            return '<p>生成建议失败</p>';
        }
    },
    
    // 生成护理技巧
    generateCareTips(report) {
        try {
            const tips = [];
            
            // 基础护理技巧
            tips.push({
                icon: 'fa-calendar-check',
                title: '定期喂养',
                description: '保持每天喂养的习惯，避免长时间不喂养'
            });
            
            tips.push({
                icon: 'fa-heart',
                title: '关注健康',
                description: '定期检查小鸡健康状况，及时发现问题'
            });
            
            tips.push({
                icon: 'fa-chart-line',
                title: '监控寿命',
                description: '定期查看寿命变化趋势，提前预防问题'
            });
            
            // 基于当前状况的技巧
            if (report.lifespanPercentage < 50) {
                tips.push({
                    icon: 'fa-users',
                    title: '协作喂养',
                    description: '邀请家庭成员协作喂养，提高护理效率'
                });
            }
            
            if (!report.healthStatus) {
                tips.push({
                    icon: 'fa-medkit',
                    title: '紧急护理',
                    description: '立即使用高级饲料，快速恢复健康状况'
                });
            }
            
            if (report.level >= 4) {
                tips.push({
                    icon: 'fa-crown',
                    title: '高级护理',
                    description: '高级小鸡需要更多关注，建议使用优质饲料'
                });
            }
            
            return tips.map(tip => `
                <div class="tip-item">
                    <div class="tip-icon">
                        <i class="fas ${tip.icon}"></i>
                    </div>
                    <div class="tip-content">
                        <div class="tip-title">${tip.title}</div>
                        <div class="tip-description">${tip.description}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('❌ 生成护理技巧错误:', error);
            return '<p>生成护理技巧失败</p>';
        }
    },
    
    // 显示调整寿命模态框（管理员功能）
    showAdjustLifespanModal(chickenId) {
        try {
            if (FamilyPark.currentUser.role !== 'admin') {
                FamilyPark.showNotification('需要管理员权限', 'error');
                return;
            }
            
            const report = this.currentLifespanData[chickenId];
            if (!report) {
                FamilyPark.showNotification('寿命数据加载中，请稍后重试', 'warning');
                return;
            }
            
            const modalHtml = `
                <div id="adjust-lifespan-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-edit"></i>
                                调整小鸡寿命 - ${report.name}
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('adjust-lifespan-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="current-status">
                                <h4>当前状态</h4>
                                <div class="status-info">
                                    <div class="status-item">
                                        <span class="label">当前寿命:</span>
                                        <span class="value">${report.currentLifespan}天</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">最大寿命:</span>
                                        <span class="value">${report.maxLifespan}天</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">寿命百分比:</span>
                                        <span class="value">${report.lifespanPercentage}%</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">健康状况:</span>
                                        <span class="value ${report.healthStatus ? 'healthy' : 'unhealthy'}">
                                            ${report.healthStatus ? '健康' : '需要关注'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="adjustment-form">
                                <h4>调整设置</h4>
                                <div class="form-group">
                                    <label class="form-label">调整天数</label>
                                    <input type="number" id="lifespan-adjustment-days" class="form-control" 
                                           placeholder="正数增加寿命，负数减少寿命">
                                    <small class="form-help">
                                        输入正数增加寿命，负数减少寿命（如：+30 或 -15）
                                    </small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">调整原因</label>
                                    <select id="lifespan-adjustment-reason" class="form-control">
                                        <option value="">请选择原因</option>
                                        <option value="管理员调整">管理员调整</option>
                                        <option value="系统补偿">系统补偿</option>
                                        <option value="错误修正">错误修正</option>
                                        <option value="特殊奖励">特殊奖励</option>
                                        <option value="其他">其他</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">详细说明</label>
                                    <textarea id="lifespan-adjustment-description" class="form-control" 
                                              rows="3" placeholder="请输入详细说明（可选）"></textarea>
                                </div>
                            </div>
                            
                            <div class="adjustment-actions">
                                <button class="btn btn-primary" onclick="FamilyPark.Lifespan.adjustLifespan('${chickenId}')">
                                    <i class="fas fa-save"></i> 确认调整
                                </button>
                                <button class="btn btn-secondary" onclick="FamilyPark.closeModal('adjust-lifespan-modal')">
                                    <i class="fas fa-times"></i> 取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('adjust-lifespan-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示调整寿命模态框错误:', error);
        }
    },
    
    // 调整寿命（管理员功能）
    async adjustLifespan(chickenId) {
        try {
            if (FamilyPark.currentUser.role !== 'admin') {
                FamilyPark.showNotification('需要管理员权限', 'error');
                return;
            }
            
            const daysInput = document.getElementById('lifespan-adjustment-days');
            const reasonSelect = document.getElementById('lifespan-adjustment-reason');
            const descriptionTextarea = document.getElementById('lifespan-adjustment-description');
            
            const days = parseInt(daysInput.value);
            const reason = reasonSelect.value;
            const description = descriptionTextarea.value;
            
            if (!days || isNaN(days)) {
                FamilyPark.showNotification('请输入有效的天数', 'error');
                return;
            }
            
            if (!reason) {
                FamilyPark.showNotification('请选择调整原因', 'error');
                return;
            }
            
            if (!confirm(`确定要调整小鸡寿命${days > 0 ? '+' : ''}${days}天吗？此操作不可恢复！`)) {
                return;
            }
            
            FamilyPark.showNotification('正在调整寿命...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/chicken/adjust-lifespan/${chickenId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    days: days,
                    reason: reason + (description ? `: ${description}` : '')
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.closeModal('adjust-lifespan-modal');
                
                // 重新加载数据
                this.loadChickenLifespanReport(chickenId);
                this.loadAllLifespanStatus();
            } else {
                FamilyPark.showNotification(data.message || '调整失败', 'error');
            }
        } catch (error) {
            console.error('❌ 调整寿命错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 切换历史标签
    switchHistoryTab(tabName) {
        try {
            // 移除所有active类
            document.querySelectorAll('.history-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.history-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // 添加active类到当前标签
            event.target.classList.add('active');
            const targetPanel = document.getElementById(`${tabName}-history`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        } catch (error) {
            console.error('❌ 切换历史标签错误:', error);
        }
    },
    
    // 手动执行寿命管理检查（管理员功能）
    async executeLifespanCheck() {
        try {
            if (FamilyPark.currentUser.role !== 'admin') {
                FamilyPark.showNotification('需要管理员权限', 'error');
                return;
            }
            
            if (!confirm('确定要执行寿命管理检查吗？这可能需要一些时间。')) {
                return;
            }
            
            FamilyPark.showNotification('正在执行寿命管理检查...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/chicken/check-lifespans`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                
                // 显示检查结果
                this.showLifespanCheckResults(data.result);
            } else {
                FamilyPark.showNotification(data.message || '检查失败', 'error');
            }
        } catch (error) {
            console.error('❌ 执行寿命管理检查错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示寿命检查结果
    showLifespanCheckResults(result) {
        try {
            const modalHtml = `
                <div id="lifespan-check-results-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-clipboard-check"></i>
                                寿命管理检查结果
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('lifespan-check-results-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="check-summary">
                                <h4>检查摘要</h4>
                                <div class="summary-stats">
                                    <div class="stat-item">
                                        <span class="label">处理的小鸡数量</span>
                                        <span class="value">${result.processed}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="label">寿命减少的小鸡</span>
                                        <span class="value ${result.lifespanReduced > 0 ? 'warning' : ''}">${result.lifespanReduced}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="label">寿命延长的小鸡</span>
                                        <span class="value ${result.lifespanExtended > 0 ? 'success' : ''}">${result.lifespanExtended}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="label">死亡的小鸡</span>
                                        <span class="value ${result.deactivated > 0 ? 'danger' : ''}">${result.deactivated}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${result.errors && result.errors.length > 0 ? `
                                <div class="check-errors">
                                    <h4>处理错误</h4>
                                    <div class="errors-list">
                                        ${result.errors.map(error => `
                                            <div class="error-item">
                                                <div class="error-chicken">小鸡ID: ${error.chickenId}</div>
                                                <div class="error-message">${error.error}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="check-actions">
                                <button class="btn btn-primary" onclick="FamilyPark.closeModal('lifespan-check-results-modal')">
                                    <i class="fas fa-check"></i> 确定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('lifespan-check-results-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示寿命检查结果错误:', error);
        }
    },
    
    // 初始化寿命管理面板
    initLifespanPanel() {
        try {
            console.log('🔬 初始化寿命管理面板');
            
            // 添加寿命管理面板到导航
            this.addLifespanPanel();
            
            // 加载所有小鸡寿命状态
            this.loadAllLifespanStatus();
            
            // 设置定时更新
            this.setupAutoUpdate();
        } catch (error) {
            console.error('❌ 初始化寿命管理面板错误:', error);
        }
    },
    
    // 添加寿命管理面板
    addLifespanPanel() {
        try {
            const navLinks = document.querySelector('.nav-links');
            if (!navLinks) return;
            
            // 检查是否已存在
            const existingPanel = document.querySelector('[data-panel="lifespan"]');
            if (existingPanel) return;
            
            // 添加导航链接
            const lifespanLink = document.createElement('li');
            lifespanLink.innerHTML = '<a href="#" class="nav-link" data-panel="lifespan">寿命管理</a>';
            navLinks.appendChild(lifespanLink);
            
            // 添加面板
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            const lifespanPanel = document.createElement('div');
            lifespanPanel.id = 'lifespan';
            lifespanPanel.className = 'panel';
            lifespanPanel.innerHTML = `
                <h1>寿命管理</h1>
                
                <div class="lifespan-overview" id="lifespan-overview">
                    <p>加载中...</p>
                </div>
                
                <div class="lifespan-actions">
                    <div class="action-buttons">
                        <button class="btn btn-info" onclick="FamilyPark.Lifespan.loadAllLifespanStatus()">
                            <i class="fas fa-sync"></i> 刷新数据
                        </button>
                        ${FamilyPark.currentUser.role === 'admin' ? `
                            <button class="btn btn-warning" onclick="FamilyPark.Lifespan.executeLifespanCheck()">
                                <i class="fas fa-play"></i> 执行寿命检查
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            mainContent.appendChild(lifespanPanel);
        } catch (error) {
            console.error('❌ 添加寿命管理面板错误:', error);
        }
    },
    
    // 设置自动更新
    setupAutoUpdate() {
        try {
            // 每10分钟更新一次数据
            setInterval(() => {
                if (FamilyPark.currentFamily) {
                    this.loadAllLifespanStatus();
                }
            }, 10 * 60 * 1000);
            
            // 每小时检查一次需要关注的小鸡
            setInterval(() => {
                this.checkCriticalLifespans();
            }, 60 * 60 * 1000);
        } catch (error) {
            console.error('❌ 设置自动更新错误:', error);
        }
    },
    
    // 检查需要关注的寿命
    checkCriticalLifespans() {
        try {
            if (!this.currentLifespanData) return;
            
            const criticalChickens = Object.values(this.currentLifespanData).filter(report => {
                return report.lifespanPercentage < 30 || !report.healthStatus;
            });
            
            if (criticalChickens.length > 0) {
                this.showCriticalLifespanNotification(criticalChickens);
            }
        } catch (error) {
            console.error('❌ 检查需要关注的寿命错误:', error);
        }
    },
    
    // 显示关键寿命通知
    showCriticalLifespanNotification(criticalChickens) {
        try {
            // 检查是否已经显示过通知
            const existingNotification = document.querySelector('.critical-lifespan-notification');
            if (existingNotification) return;
            
            const notification = document.createElement('div');
            notification.className = 'notification notification-warning critical-lifespan-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        有${criticalChickens.length}只小鸡需要关注寿命状况
                    </span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="notification-actions">
                    <button class="btn btn-sm btn-info" onclick="FamilyPark.Lifespan.loadAllLifespanStatus()">
                        查看详情
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="this.parentElement.parentElement.remove()">
                        稍后处理
                    </button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // 30秒后自动移除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 30000);
        } catch (error) {
            console.error('❌ 显示关键寿命通知错误:', error);
        }
    }
};

console.log('🔬 寿命管理模块加载完成');
