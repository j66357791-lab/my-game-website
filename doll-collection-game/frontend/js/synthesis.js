// 合成功能
const Synthesis = {
    // 更新可用娃娃列表 - 增强错误处理
    updateAvailableDolls() {
        const availableDollsContainer = document.getElementById('available-dolls');
        if (!availableDollsContainer) {
            console.error('找不到available-dolls容器');
            return;
        }
        
        availableDollsContainer.innerHTML = '';
        
        if (!userDolls || !Array.isArray(userDolls)) {
            console.log('娃娃数据未加载，显示加载中...');
            availableDollsContainer.innerHTML = '<p>数据加载中...</p>';
            return;
        }
        
        const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
        const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
        
        console.log('可用娃娃数量:', availableDolls.length);
        console.log('可用娃娃详情:', availableDolls);
        
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
                    <button class="btn btn-block" onclick="Synthesis.selectDollForSynthesisFromList('${doll._id}')">选择</button>
                </div>
            `;
            availableDollsContainer.appendChild(dollCard);
        });
    },
    
    // 选择娃娃用于合成 - 增强错误处理
    selectDollForSynthesis(slot) {
        console.log('选择合成槽位:', slot);
        
        if (selectedDollsForSynthesis[slot-1]) {
            selectedDollsForSynthesis[slot-1] = null;
            const slotElement = document.getElementById(`slot${slot}`);
            if (slotElement) {
                slotElement.innerHTML = '<i class="fas fa-plus"></i>';
                slotElement.classList.remove('selected');
            }
            Synthesis.updateSynthesisButton();
            Synthesis.updateSuccessRate();
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
        console.log('选择的娃娃:', selectedDoll);
        selectedDollsForSynthesis[slot-1] = selectedDoll;
        
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
        
        Synthesis.updateSynthesisButton();
        Synthesis.updateSuccessRate();
    },
    
    // 从列表中选择娃娃用于合成 - 增强错误处理
    selectDollForSynthesisFromList(dollId) {
        console.log('从列表选择娃娃:', dollId);
        
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
        
        console.log('放入槽位:', emptySlot + 1, '娃娃:', doll);
        selectedDollsForSynthesis[emptySlot] = doll;
        
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
        
        Synthesis.updateSynthesisButton();
        Synthesis.updateSuccessRate();
    },
    
    // 更新合成按钮状态
    updateSynthesisButton() {
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
    
    // 合成娃娃 - 增强错误处理
    async synthesizeDolls() {
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
            console.log('开始合成:', { doll1Id: doll1._id, doll2Id: doll2._id, points });
            
            const response = await fetch(`${CONFIG.API_BASE}/dolls/synthesize`, {
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
            console.log('合成响应:', data);
            
            if (response.ok) {
                currentUser.points = data.user.points;
                userDolls = Array.isArray(data.dolls) ? data.dolls : [];
                UI.updateUI();
                Dolls.updateUserStats();
                Dolls.updateMyDollsList();
                Synthesis.updateAvailableDolls();
                Dolls.updateBackpackDisplay();
                Dolls.updateBackpackStats(userDolls.length, userDolls.length);
                
                if (data.success) {
                    Utils.showNotification(`合成成功！获得${data.newDoll.level}级娃娃！`, 'success');
                } else {
                    Utils.showNotification('合成失败！积分已消耗，娃娃保持不变。', 'warning');
                }
                
                Synthesis.resetSynthesisInterface();
            } else {
                Utils.showNotification(data.message || '合成失败', 'error');
            }
        } catch (error) {
            console.error('合成娃娃错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 重置合成界面
    resetSynthesisInterface() {
        selectedDollsForSynthesis = [null, null];
        
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
        
        Synthesis.updateSynthesisButton();
        Synthesis.updateSuccessRate();
    },
    
    // 获取合成记录
    async loadSynthesisRecords() {
        if (!currentUser) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/dolls/synthesis-records`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                Synthesis.updateSynthesisRecordsTable(Array.isArray(data.records) ? data.records : []);
            } else {
                console.error('获取合成记录失败');
                Synthesis.updateSynthesisRecordsTable([]);
            }
        } catch (error) {
            console.error('获取合成记录错误:', error);
            Synthesis.updateSynthesisRecordsTable([]);
        }
    },
    
    // 更新合成记录表格
    updateSynthesisRecordsTable(records) {
        const recordsTable = document.getElementById('synthesis-records-table');
        if (!recordsTable) return;
        
        recordsTable.innerHTML = '';
        
        if (!Array.isArray(records) || records.length === 0) {
            recordsTable.innerHTML = '<tr><td colspan="6">暂无合成记录</td></tr>';
            return;
        }
        
        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDateTime(record.createdAt)}</td>
                <td>${record.transferData ? record.transferData.doll1Level + '级 + ' + record.transferData.doll2Level + '级' : '未知'}</td>
                <td>${record.transferData ? record.transferData.pointsUsed || 0 : 0} 积分</td>
                <td>${record.transferData ? record.transferData.successRate || 0 : 0}%</td>
                <td>
                    ${record.transferData && record.transferData.success ? 
                        `<span style="color: green;">成功 → ${record.transferData.newDollLevel}级</span>` : 
                        `<span style="color: red;">失败</span>`
                    }
                </td>
                <td>${record.transferData ? record.transferData.newDollId ? record.transferData.newDollId.substring(0, 8) + '...' : '无'}</td>
            `;
            recordsTable.appendChild(row);
        });
    },
    
    // 初始化合成事件监听器
    initEventListeners() {
        console.log('初始化合成事件监听器...');
        
        // 合成积分输入
        const synthesisPoints = document.getElementById('synthesis-points');
        if (synthesisPoints) {
            synthesisPoints.addEventListener('input', Synthesis.updateSuccessRate);
        }
        
        // 合成按钮
        const synthesisBtn = document.getElementById('synthesis-btn');
        if (synthesisBtn) {
            synthesisBtn.addEventListener('click', Synthesis.synthesizeDolls);
        }
        
        console.log('合成事件监听器初始化完成');
    }
};
