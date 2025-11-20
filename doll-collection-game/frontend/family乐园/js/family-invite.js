// 家庭乐园前端JavaScript - 邀请功能模块
console.log('👥 邀请功能模块加载中...');

// 扩展FamilyPark命名空间 - 邀请功能
FamilyPark.Invite = {
    // 显示邀请好友模态框
    showInviteModal() {
        try {
            console.log('👥 显示邀请好友模态框');
            
            // 加载好友列表到选择框
            this.loadFriendsToInviteSelect();
            
            const modal = document.getElementById('invite-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ 显示邀请好友模态框错误:', error);
        }
    },
    
    // 加载好友到邀请选择框
    async loadFriendsToInviteSelect() {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const select = document.getElementById('invite-friend-select');
                if (select) {
                    select.innerHTML = '<option value="">请选择好友</option>';
                    
                    if (Array.isArray(data.friends)) {
                        data.friends.forEach(friend => {
                            const option = document.createElement('option');
                            option.value = friend.userId._id;
                            option.textContent = friend.userId.username;
                            select.appendChild(option);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ 加载好友列表错误:', error);
        }
    },
    
    // 邀请好友
    async inviteFriend() {
        try {
            const friendId = document.getElementById('invite-friend-select').value;
            
            if (!friendId) {
                FamilyPark.showNotification('请选择要邀请的好友', 'warning');
                return;
            }
            
            const response = await fetch(`${FamilyPark.getApiBase()}/family/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ friendId: friendId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.closeModal('invite-modal');
                FamilyPark.loadFamilyData(); // 重新加载家庭数据
            } else {
                FamilyPark.showNotification(data.message || '邀请失败', 'error');
            }
        } catch (error) {
            console.error('邀请好友错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

console.log('👥 邀请功能模块加载完成');
