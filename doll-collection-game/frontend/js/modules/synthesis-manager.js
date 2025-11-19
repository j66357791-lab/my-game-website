// 合成管理模块
const SynthesisManager = {
    // 更新可用娃娃列表
    updateAvailableDolls() {
        const { userDolls } = window.AppState;
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
                    <button class="btn btn-block" onclick="SynthesisManager.selectDollForSynthesisFromList('${doll._id}')">选择</button>
                </div>
            `;
            availableDollsContainer.appendChild(dollCard);
        });
    },

    // 选择娃娃用于合成
    selectDollForSynthesis(slot) {
        const { userDolls, selectedDollsForSynthesis } = window.AppState;
        
        if (selectedDollsForSynthesis[slot-1]) {
            selectedDollsForSynthesis[slot-1] = null;
            const slotElement = document.getElementById(`slot${slot}`);
            if (slotElement) {
                slotElement.innerHTML = '<i class="fas fa-plus"></i>';
                slotElement.classList.remove('selected');
            }
            this.updateSynthesisButton();
            this.updateSuccessRate();
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
        window.updateAppState({ selectedDollsForSynthesis });
        
        const slotElement = document.getElementById(`slot${slot}`);
        if (slotElement) {
            slotElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-doll" style="font-size: 30px;"></i>
                    <div style="margin-top: 5px;">${selectedDoll.level}级</div>
                </div>
            `;
            slotElement.classList.add('selected');
        }
        
        this.updateSynthesisButton();
        this.updateSuccessRate();
    },

    // 从列表中选择娃娃用于合成
    selectDollForSynthesisFromList(dollId) {
        const { userDolls, selectedDollsForSynthesis } = window.AppState;
        
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
        window.updateAppState({ selectedDollsForSynthesis });
        
        const slotElement = document.getElementById(`slot${emptySlot+1}`);
        if (slotElement) {
            slotElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-doll" style="font-size: 30px;"></i>
                    <div style="margin-top: 5px;">${doll.level}级</div>
                </div>
            `;
            slotElement.classList.add('selected');
        }
        
        this.updateSynthesisButton();
        this.updateSuccessRate();
    },

    // 更新合成按钮状态
    updateSynthesisButton() {
        const { selectedDollsForSynthesis } = window.AppState;
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

    // 合成娃娃
    async synthesizeDolls() {
        const { currentUser, selectedDollsForSynthesis } = window.AppState;
        
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
        
        try {
            const response = await fetch(`${window.AppState.API_BASE}/dolls/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    doll1Id: doll1._id,
                    doll2Id: doll2._id,
                    points
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                window.updateAppState({ 
                    currentUser: data.user,
                    userDolls: Array.isArray(data.dolls) ? data.dolls : []
                });
                
                UIManager.updateUI();
                UserDataManager.updateUserStats();
                UserDataManager.updateMyDollsList();
                this.updateAvailableDolls();
                
                if (data.success) {
                    alert(`合成成功！获得${data.newDoll.level}级娃娃！`);
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
        window.updateAppState({ selectedDollsForSynthesis });
        
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
    }
};
