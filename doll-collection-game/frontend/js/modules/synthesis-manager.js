// 合成管理模块
const SynthesisManager = {
    // 更新可用娃娃列表
    updateAvailableDolls() {
        const { userDolls } = AppState;
        const availableDollsContainer = document.getElementById('available-dolls');
        if (!availableDollsContainer) return;
        
        availableDollsContainer.innerHTML = '';
        
        if (!userDolls || !Array.isArray(userDolls)) {
            availableDollsContainer.innerHTML = '<p>数据加载中...</p>';
            return;
        }
        
        const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
        const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
        
        if (availableDolls.length === 0) {
            availableDollsContainer.innerHTML = '<p>没有可用的娃娃进行合成！</p>';
            return;
        }
        
        availableDolls.forEach(doll => {
            const dollCard = document.createElement('div');
            dollCard.className = 'doll-card';
            dollCard.innerHTML = `
                <div class="doll-header">
                    <h3>${doll.level}级娃娃</h3>
                    <div class="doll-level">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
                </div>
                <div class="doll-body">
                    <div class="doll-feature">
                        <i class="fas fa-gem"></i>
                        <span>每日收益 ${doll.dailyIncome || 0} 积分</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-clock"></i>
                        <span>剩余 ${doll.remainingDays || 0} 天</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-hourglass-half"></i>
                        <span>总寿命 ${doll.lifespan || 0} 天</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-info-circle"></i>
                        <span>状态: ${this.getDollStatus(doll)}</span>
                    </div>
                    <button class="btn btn-block" onclick="SynthesisManager.selectDollForSynthesisFromList('${doll._id}')">选择</button>
                </div>
            `;
            availableDollsContainer.appendChild(dollCard);
        });
    },

    // 获取娃娃状态描述
    getDollStatus(doll) {
        if (doll.remainingDays === doll.lifespan) {
            return '满寿命';
        } else if (doll.remainingDays > doll.lifespan * 0.7) {
            return '良好';
        } else if (doll.remainingDays > doll.lifespan * 0.3) {
            return '一般';
        } else {
            return '即将到期';
        }
    },

    // 选择娃娃用于合成
    selectDollForSynthesis(slot) {
        const { userDolls, selectedDollsForSynthesis } = AppState;
        
        if (selectedDollsForSynthesis[slot-1]) {
            selectedDollsForSynthesis[slot-1] = null;
            const slotElement = document.getElementById(`slot${slot}`);
            if (slotElement) {
                slotElement.innerHTML = '<i class="fas fa-plus"></i>';
                slotElement.classList.remove('selected');
            }
            this.updateSynthesisButton();
            this.updateSuccessRate();
            this.updateSynthesisPreview();
            return;
        }
        
        if (!userDolls || !Array.isArray(userDolls)) {
            alert('娃娃数据加载中，请稍后重试！');
            return;
        }
        
        const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
        const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
        
        if (availableDolls.length === 0) {
            alert('没有可用的娃娃！');
            return;
        }
        
        const selectedDoll = availableDolls[0];
        selectedDollsForSynthesis[slot-1] = selectedDoll;
        AppState.updateState({ selectedDollsForSynthesis });
        
        const slotElement = document.getElementById(`slot${slot}`);
        if (slotElement) {
            slotElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-doll" style="font-size: 30px;"></i>
                    <div style="margin-top: 5px;">${selectedDoll.level}级</div>
                    <div style="font-size: 12px; color: #666;">剩余${selectedDoll.remainingDays}天</div>
                    <div style="font-size: 10px; color: #999;">总寿命${selectedDoll.lifespan}天</div>
                </div>
            `;
            slotElement.classList.add('selected');
        }
        
        this.updateSynthesisButton();
        this.updateSuccessRate();
        this.updateSynthesisPreview();
    },

    // 从列表中选择娃娃用于合成
    selectDollForSynthesisFromList(dollId) {
        const { userDolls, selectedDollsForSynthesis } = AppState;
        
        if (!userDolls || !Array.isArray(userDolls)) {
            alert('娃娃数据加载中，请稍后重试！');
            return;
        }
        
        const doll = userDolls.find(d => d._id === dollId);
        if (!doll) {
            alert('娃娃不存在！');
            return;
        }
        
        let emptySlot = -1;
        for (let i = 0; i < selectedDollsForSynthesis.length; i++) {
            if (!selectedDollsForSynthesis[i]) {
                emptySlot = i;
                break;
            }
        }
        
        if (emptySlot === -1) {
            alert('合成槽已满！请先取消选择一个娃娃。');
            return;
        }
        
        selectedDollsForSynthesis[emptySlot] = doll;
        AppState.updateState({ selectedDollsForSynthesis });
        
        const slotElement = document.getElementById(`slot${emptySlot+1}`);
        if (slotElement) {
            slotElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-doll" style="font-size: 30px;"></i>
                    <div style="margin-top: 5px;">${doll.level}级</div>
                    <div style="font-size: 12px; color: #666;">剩余${doll.remainingDays}天</div>
                    <div style="font-size: 10px; color: #999;">总寿命${doll.lifespan}天</div>
                </div>
            `;
            slotElement.classList.add('selected');
        }
        
        this.updateSynthesisButton();
        this.updateSuccessRate();
        this.updateSynthesisPreview();
    },

    // 更新合成按钮状态
    updateSynthesisButton() {
        const { selectedDollsForSynthesis } = AppState;
        const synthesisBtn = document.getElementById('synthesis-btn');
        if (synthesisBtn) {
            synthesisBtn.disabled = !(selectedDollsForSynthesis[0] && selectedDollsForSynthesis[1]);
        }
    },

    // 更新成功率
    updateSuccessRate() {
        const pointsInput = document.getElementById('synthesis-points');
        const successRateElement = document.getElementById('success-rate');
        
        if (!pointsInput || !successRateElement) return;
        
        const points = parseInt(pointsInput.value) || 0;
        const baseRate = 0;
        const successRate = baseRate + (points * 0.9);
        
        successRateElement.textContent = `当前成功率: ${Math.min(successRate, 100).toFixed(1)}%`;
    },

    // 更新合成预览
    updateSynthesisPreview() {
        const { selectedDollsForSynthesis } = AppState;
        const resultSlot = document.getElementById('result-slot');
        
        if (!selectedDollsForSynthesis[0] || !selectedDollsForSynthesis[1]) {
            if (resultSlot) {
                resultSlot.innerHTML = '<i class="fas fa-question"></i>';
            }
            return;
        }
        
        const doll1 = selectedDollsForSynthesis[0];
        const doll2 = selectedDollsForSynthesis[1];
        
        if (doll1.level !== doll2.level) {
            if (resultSlot) {
                resultSlot.innerHTML = '<i class="fas fa-times" style="color: red;"></i>';
            }
            return;
        }
        
        if (doll1.level >= 3) {
            if (resultSlot) {
                resultSlot.innerHTML = '<i class="fas fa-ban" style="color: red;"></i>';
            }
            return;
        }
        
        const newLevel = doll1.level + 1;
        const expectedLifespan = this.calculateSynthesizedLifespan(doll1, doll2, newLevel);
        
        if (resultSlot) {
            resultSlot.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-doll" style="font-size: 30px; color: var(--primary);"></i>
                    <div style="margin-top: 5px;">${newLevel}级</div>
                    <div style="font-size: 12px; color: var(--primary);">寿命${expectedLifespan}天</div>
                </div>
            `;
        }
    },

    // 计算合成娃娃的寿命（修复版）
    calculateSynthesizedLifespan(doll1, doll2, newLevel) {
        // 不同等级的基础寿命
        const baseLifespans = {
            1: 60,  // 一级娃娃基础寿命
            2: 70,  // 二级娃娃基础寿命
            3: 90   // 三级娃娃基础寿命
        };
        
        // 检查两个娃娃是否都是满寿命
        const doll1FullLifespan = doll1.remainingDays === doll1.lifespan;
        const doll2FullLifespan = doll2.remainingDays === doll2.lifespan;
        
        // 如果两个娃娃都是满寿命，新娃娃获得满寿命
        if (doll1FullLifespan && doll2FullLifespan) {
            return baseLifespans[newLevel];
        }
        
        // 如果只有一个娃娃是满寿命，新娃娃获得基础寿命的80%
        if (doll1FullLifespan || doll2FullLifespan) {
            return Math.floor(baseLifespans[newLevel] * 0.8);
        }
        
        // 如果两个娃娃都不是满寿命，根据剩余天数计算
        const avgRemainingDays = Math.floor((doll1.remainingDays + doll2.remainingDays) / 2);
        
        // 使用材料娃娃剩余天数的平均值，但不超过基础寿命的70%
        const maxLifespan = Math.floor(baseLifespans[newLevel] * 0.7);
        const calculatedLifespan = Math.min(avgRemainingDays, maxLifespan);
        
        // 最低保证30天寿命
        return Math.max(calculatedLifespan, 30);
    },

    // 合成娃娃
    async synthesizeDolls() {
        const { currentUser, selectedDollsForSynthesis } = AppState;
        
        if (!selectedDollsForSynthesis[0] || !selectedDollsForSynthesis[1]) {
            alert('请选择两个娃娃进行合成！');
            return;
        }
        
        const doll1 = selectedDollsForSynthesis[0];
        const doll2 = selectedDollsForSynthesis[1];
        
        if (doll1.level !== doll2.level) {
            alert('只能合成相同等级的娃娃！');
            return;
        }
        
        if (doll1.level >= 3) {
            alert('无法合成更高级别的娃娃！');
            return;
        }
        
        const pointsInput = document.getElementById('synthesis-points');
        const points = parseInt(pointsInput?.value) || 0;
        
        if (currentUser.points < points) {
            alert('积分不足！');
            return;
        }
        
        // 计算预期的寿命
        const newLevel = doll1.level + 1;
        const expectedLifespan = this.calculateSynthesizedLifespan(doll1, doll2, newLevel);
        
        // 确认合成
        const confirmMessage = `确定要合成吗？\n` +
            `材料：${doll1.level}级娃娃 + ${doll2.level}级娃娃\n` +
            `结果：${newLevel}级娃娃\n` +
            `新娃娃寿命：${expectedLifespan}天\n` +
            `消耗积分：${points}分`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const response = await fetch(`${AppState.API_BASE}/dolls/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    doll1Id: doll1._id,
                    doll2Id: doll2._id,
                    points,
                    // 传递计算好的寿命信息给后端
                    synthesizedLifespan: expectedLifespan
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                AppState.updateState({ 
                    currentUser: data.user,
                    userDolls: Array.isArray(data.dolls) ? data.dolls : []
                });
                
                UIManager.updateUI();
                
                // 🔧 关键修复：强制刷新娃娃数据
                UserDataManager.updateUserStats();
                UserDataManager.updateMyDollsList();
                this.updateAvailableDolls();
                
                if (data.success) {
                    const expectedLifespan = this.calculateSynthesizedLifespan(doll1, doll2, doll1.level + 1);
                    alert(`合成成功！获得${data.newDoll.level}级娃娃！\n新娃娃寿命：${data.newDoll.lifespan}天`);
                } else {
                    alert('合成失败！积分已消耗，娃娃保持不变。');
                }
                
                this.resetSynthesisInterface();
            } else {
                alert(data.message || '合成失败');
            }
        } catch (error) {
            console.error('合成娃娃错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 重置合成界面
    resetSynthesisInterface() {
        const selectedDollsForSynthesis = [null, null];
        AppState.updateState({ selectedDollsForSynthesis });
        
        for (let i = 1; i <= 2; i++) {
            const slotElement = document.getElementById(`slot${i}`);
            if (slotElement) {
                slotElement.innerHTML = '<i class="fas fa-plus"></i>';
                slotElement.classList.remove('selected');
            }
        }
        
        const resultSlot = document.getElementById('result-slot');
        if (resultSlot) {
            resultSlot.innerHTML = '<i class="fas fa-question"></i>';
        }
        
        const pointsInput = document.getElementById('synthesis-points');
        if (pointsInput) {
            pointsInput.value = '0';
        }
        
        this.updateSynthesisButton();
        this.updateSuccessRate();
        this.updateSynthesisPreview();
    }
};

// 导出到全局作用域
window.SynthesisManager = SynthesisManager;
