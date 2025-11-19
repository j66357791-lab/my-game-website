// 合成功能 - 完全重写版本 - 确保语法正确
const Synthesis = {
    // 更新可用娃娃列表
    updateAvailableDolls: function() {
        console.log('更新可用娃娃列表');
        
        const availableDollsContainer = document.getElementById('available-dolls');
        if (!availableDollsContainer) {
            console.error('找不到available-dolls容器');
            return;
        }
        
        availableDollsContainer.innerHTML = '';
        
        if (!window.userDolls || !Array.isArray(window.userDolls)) {
            console.log('娃娃数据未加载，显示加载中...');
            availableDollsContainer.innerHTML = '<p>数据加载中...</p>';
            return;
        }
        
        const validDolls = window.userDolls.filter(function(doll) {
            return doll && typeof doll === 'object';
        });
        
        const availableDolls = validDolls.filter(function(doll) {
            return doll.active && doll.level < 3;
        });
        
        console.log('可用娃娃数量:', availableDolls.length);
        
        if (availableDolls.length === 0) {
            availableDollsContainer.innerHTML = '<p>没有可用的娃娃进行合成！</p>';
            return;
        }
        
        availableDolls.forEach(function(doll) {
            const dollCard = document.createElement('div');
            dollCard.className = 'doll-card';
            
            const dollId = doll._id ? doll._id.substring(0, 8) + '...' : '未知';
            const dailyIncome = doll.dailyIncome || 0;
            const remainingDays = doll.remainingDays || 0;
            
            dollCard.innerHTML = '<div class="doll-header">' +
                '<h3>' + doll.level + '级娃娃</h3>' +
                '<div class="doll-level">ID: ' + dollId + '</div>' +
                '</div>' +
                '<div class="doll-body">' +
                '<div class="doll-feature">' +
                '<i class="fas fa-gem"></i>' +
                '<span>每日收益 ' + dailyIncome + ' 积分</span>' +
                '</div>' +
                '<div class="doll-feature">' +
                '<i class="fas fa-clock"></i>' +
                '<span>剩余 ' + remainingDays + ' 天</span>' +
                '</div>' +
                '<button class="btn btn-block" onclick="Synthesis.selectDollForSynthesisFromList(\'' + doll._id + '\')">选择</button>' +
                '</div>';
            
            availableDollsContainer.appendChild(dollCard);
        });
    },
    
    // 选择娃娃用于合成
    selectDollForSynthesis: function(slot) {
        console.log('选择合成槽位:', slot);
        
        if (window.selectedDollsForSynthesis[slot-1]) {
            window.selectedDollsForSynthesis[slot-1] = null;
            const slotElement = document.getElementById('slot' + slot);
            if (slotElement) {
                slotElement.innerHTML = '<i class="fas fa-plus"></i>';
                slotElement.classList.remove('selected');
            }
            Synthesis.updateSynthesisButton();
            Synthesis.updateSuccessRate();
            return;
        }
        
        if (!window.userDolls || !Array.isArray(window.userDolls)) {
            alert('娃娃数据加载中，请稍后重试！');
            return;
        }
        
        const validDolls = window.userDolls.filter(function(doll) {
            return doll && typeof doll === 'object';
        });
        
        const availableDolls = validDolls.filter(function(doll) {
            return doll.active && doll.level < 3;
        });
        
        if (availableDolls.length === 0) {
            alert('没有可用的娃娃！');
            return;
        }
        
        const selectedDoll = availableDolls[0];
        console.log('选择的娃娃:', selectedDoll);
        window.selectedDollsForSynthesis[slot-1] = selectedDoll;
        
        const slotElement = document.getElementById('slot' + slot);
        if (slotElement) {
            slotElement.innerHTML = '<div style="text-align: center;">' +
                '<i class="fas fa-doll" style="font-size: 30px;"></i>' +
                '<div style="margin-top: 5px;">' + selectedDoll.level + '级</div>' +
                '</div>';
            slotElement.classList.add('selected');
        }
        
        Synthesis.updateSynthesisButton();
        Synthesis.updateSuccessRate();
    },
    
    // 从列表中选择娃娃用于合成
    selectDollForSynthesisFromList: function(dollId) {
        console.log('从列表选择娃娃:', dollId);
        
        if (!window.userDolls || !Array.isArray(window.userDolls)) {
            alert('娃娃数据加载中，请稍后重试！');
            return;
        }
        
        const doll = window.userDolls.find(function(d) {
            return d._id === dollId;
        });
        
        if (!doll) {
            alert('娃娃不存在！');
            return;
        }
        
        let emptySlot = -1;
        for (let i = 0; i < window.selectedDollsForSynthesis.length; i++) {
            if (!window.selectedDollsForSynthesis[i]) {
                emptySlot = i;
                break;
            }
        }
        
        if (emptySlot === -1) {
            alert('合成槽已满！请先取消选择一个娃娃。');
            return;
        }
        
        console.log('放入槽位:', emptySlot + 1, '娃娃:', doll);
        window.selectedDollsForSynthesis[emptySlot] = doll;
        
        const slotElement = document.getElementById('slot' + (emptySlot + 1));
        if (slotElement) {
            slotElement.innerHTML = '<div style="text-align: center;">' +
                '<i class="fas fa-doll" style="font-size: 30px;"></i>' +
                '<div style="margin-top: 5px;">' + doll.level + '级</div>' +
                '</div>';
            slotElement.classList.add('selected');
        }
        
        Synthesis.updateSynthesisButton();
        Synthesis.updateSuccessRate();
    },
    
    // 更新合成按钮状态
    updateSynthesisButton: function() {
        const synthesisBtn = document.getElementById('synthesis-btn');
        if (synthesisBtn) {
            const hasBothDolls = window.selectedDollsForSynthesis[0] && window.selectedDollsForSynthesis[1];
            synthesisBtn.disabled = !hasBothDolls;
        }
    },
    
    // 更新成功率
    updateSuccessRate: function() {
        const pointsInput = document.getElementById('synthesis-points');
        const successRateElement = document.getElementById('success-rate');
        
        if (!pointsInput || !successRateElement) {
            return;
        }
        
        const points = parseInt(pointsInput.value) || 0;
        const baseRate = 0;
        const successRate = baseRate + (points * 0.9);
        const finalRate = Math.min(successRate, 100).toFixed(1);
        
        successRateElement.textContent = '当前成功率: ' + finalRate + '%';
    },
    
    // 合成娃娃
    synthesizeDolls: async function() {
        if (!window.selectedDollsForSynthesis[0] || !window.selectedDollsForSynthesis[1]) {
            alert('请选择两个娃娃进行合成！');
            return;
        }
        
        const doll1 = window.selectedDollsForSynthesis[0];
        const doll2 = window.selectedDollsForSynthesis[1];
        
        if (doll1.level !== doll2.level) {
            alert('只能合成相同等级的娃娃！');
            return;
        }
        
        if (doll1.level >= 3) {
            alert('无法合成更高级别的娃娃！');
            return;
        }
        
        const pointsInput = document.getElementById('synthesis-points');
        const points = parseInt(pointsInput.value) || 0;
        
        if (!window.currentUser || window.currentUser.points < points) {
            alert('积分不足！');
            return;
        }
        
        try {
            console.log('开始合成:', {
                doll1Id: doll1._id,
                doll2Id: doll2._id,
                points: points
            });
            
            const response = await fetch(window.CONFIG.API_BASE + '/dolls/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({
                    doll1Id: doll1._id,
                    doll2Id: doll2._id,
                    points: points
                })
            });
            
            console.log('合成响应状态:', response.status);
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('服务器返回非JSON响应:', text);
                throw new Error('服务器返回了错误的响应格式');
            }
            
            console.log('合成响应数据:', data);
            
            if (response.ok) {
                window.currentUser.points = data.user.points;
                window.userDolls = Array.isArray(data.dolls) ? data.dolls : [];
                window.UI.updateUI();
                window.Dolls.updateUserStats();
                window.Dolls.updateMyDollsList();
                Synthesis.updateAvailableDolls();
                window.Dolls.updateBackpackDisplay();
                window.Dolls.updateBackpackStats(window.userDolls.length, window.userDolls.length);
                
                if (data.success) {
                    window.Utils.showNotification('合成成功！获得' + data.newDoll.level + '级娃娃！', 'success');
                } else {
                    window.Utils.showNotification('合成失败！积分已消耗，娃娃保持不变。', 'warning');
                }
                
                Synthesis.resetSynthesisInterface();
            } else {
                window.Utils.showNotification(data.message || '合成失败', 'error');
            }
        } catch (error) {
            console.error('合成娃娃错误:', error);
            
            if (error.message.includes('Failed to fetch')) {
                window.Utils.showNotification('网络连接失败，请检查网络', 'error');
            } else if (error.message.includes('JSON')) {
                window.Utils.showNotification('服务器响应错误，请联系管理员', 'error');
            } else {
                window.Utils.showNotification('网络错误，请稍后重试', 'error');
            }
        }
    },
    
    // 重置合成界面
    resetSynthesisInterface: function() {
        window.selectedDollsForSynthesis = [null, null];
        
        for (let i = 1; i <= 2; i++) {
            const slotElement = document.getElementById('slot' + i);
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
    loadSynthesisRecords: async function() {
        if (!window.currentUser) {
            return;
        }
        
        try {
            const response = await fetch(window.CONFIG.API_BASE + '/dolls/synthesis-records', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
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
    updateSynthesisRecordsTable: function(records) {
        const recordsTable = document.getElementById('synthesis-records-table');
        if (!recordsTable) {
            return;
        }
        
        recordsTable.innerHTML = '';
        
        if (!Array.isArray(records) || records.length === 0) {
            recordsTable.innerHTML = '<tr><td colspan="6">暂无合成记录</td></tr>';
            return;
        }
        
        records.forEach(function(record) {
            const row = document.createElement('tr');
            
            const createdAt = record.createdAt ? window.Utils.formatDateTime(record.createdAt) : '未知时间';
            const doll1Level = record.transferData ? record.transferData.doll1Level : '未知';
            const doll2Level = record.transferData ? record.transferData.doll2Level : '未知';
            const pointsUsed = record.transferData ? record.transferData.pointsUsed || 0 : 0;
            const successRate = record.transferData ? record.transferData.successRate || 0 : 0;
            
            let resultText = '未知';
            if (record.transferData && record.transferData.success) {
                resultText = '<span style="color: green;">成功 → ' + record.transferData.newDollLevel + '级</span>';
            } else {
                resultText = '<span style="color: red;">失败</span>';
            }
            
            const newDollId = record.transferData && record.transferData.newDollId ? 
                record.transferData.newDollId.substring(0, 8) + '...' : '无';
            
            row.innerHTML = '<td>' + createdAt + '</td>' +
                '<td>' + doll1Level + '级 + ' + doll2Level + '级</td>' +
                '<td>' + pointsUsed + ' 积分</td>' +
                '<td>' + successRate + '%</td>' +
                '<td>' + resultText + '</td>' +
                '<td>' + newDollId + '</td>';
            
            recordsTable.appendChild(row);
        });
    },
    
    // 初始化合成事件监听器
    initEventListeners: function() {
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

// 导出模块
window.Synthesis = Synthesis;

console.log('✅ synthesis.js 加载完成');
