// 家庭乐园前端JavaScript - 好友系统模块
console.log('👥 好友系统模块加载中...');

// 扩展FamilyPark命名空间 - 好友系统功能
FamilyPark.Friends = {
    // 切换好友标签页
    switchFriendsTab(tabName) {
        try {
            document.querySelectorAll('.friends-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.friends-content').forEach(content => {
                content.classList.remove('active');
            });
            
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            const targetContent = document.getElementById(`friends-${tabName}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        } catch (error) {
            console.error('❌ 切换好友标签页错误:', error);
        }
    },
    
    // 加载好友数据
    async loadFriendsData() {
        if (!FamilyPark.currentUser) return;
        
        try {
            // 获取好友列表
            const friendsResponse = await fetch(`${FamilyPark.getApiBase()}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                FamilyPark.userFriends = Array.isArray(friendsData.friends) ? friendsData.friends : [];
                this.updateFriendsList();
            }
            
            // 获取好友请求
            const requestsResponse = await fetch(`${FamilyPark.getApiBase()}/friends/requests`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                FamilyPark.friendRequests = Array.isArray(requestsData.requests) ? requestsData.requests : [];
                this.updateFriendRequests();
            }
        } catch (error) {
            console.error('加载好友数据错误:', error);
        }
    },
    
    // 更新好友列表
    updateFriendsList() {
        try {
            const friendsContainer = document.getElementById('my-friends');
            if (!friendsContainer) return;
            
            friendsContainer.innerHTML = '';
            
            if (!Array.isArray(FamilyPark.userFriends) || FamilyPark.userFriends.length === 0) {
                friendsContainer.innerHTML = '<p>暂无好友</p>';
                return;
            }
            
            FamilyPark.userFriends.forEach(friend => {
                const friendCard = document.createElement('div');
                friendCard.className = 'user-card';
                
                friendCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${friend.userId.username}</div>
                            <div class="user-email">${friend.userId.email}</div>
                            <div class="friend-date">添加于 ${new Date(friend.addedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-danger" onclick="FamilyPark.Friends.deleteFriend('${friend.userId._id}')">删除好友</button>
                    </div>
                `;
                friendsContainer.appendChild(friendCard);
            });
        } catch (error) {
            console.error('❌ 更新好友列表错误:', error);
        }
    },
    
    // 更新好友请求
    updateFriendRequests() {
        try {
            const requestsContainer = document.getElementById('friend-requests');
            if (!requestsContainer) return;
            
            requestsContainer.innerHTML = '';
            
            if (!Array.isArray(FamilyPark.friendRequests) || FamilyPark.friendRequests.length === 0) {
                requestsContainer.innerHTML = '<p>暂无好友请求</p>';
                return;
            }
            
            FamilyPark.friendRequests.forEach(request => {
                const requestCard = document.createElement('div');
                requestCard.className = 'user-card';
                requestCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${request.fromUserId.username}</div>
                            <div class="user-email">${request.fromUserId.email}</div>
                            <div class="request-date">请求于 ${new Date(request.requestedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-success" onclick="FamilyPark.Friends.respondFriendRequest('${request._id}', 'accept')">接受</button>
                        <button class="btn btn-sm btn-danger" onclick="FamilyPark.Friends.respondFriendRequest('${request._id}', 'reject')">拒绝</button>
                    </div>
                `;
                requestsContainer.appendChild(requestCard);
            });
        } catch (error) {
            console.error('❌ 更新好友请求错误:', error);
        }
    },
    
    // 搜索用户
    async searchUsers() {
        try {
            const username = document.getElementById('search-username').value.trim();
            if (!username) {
                FamilyPark.showNotification('请输入搜索关键词', 'warning');
                return;
            }
            
            const response = await fetch(`${FamilyPark.getApiBase()}/friends/search?username=${encodeURIComponent(username)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displaySearchResults(data.users);
            } else {
                FamilyPark.showNotification(data.message || '搜索失败', 'error');
            }
        } catch (error) {
            console.error('搜索用户错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示搜索结果
    displaySearchResults(users) {
        try {
            const resultsContainer = document.getElementById('search-results');
            if (!resultsContainer) return;
            
            resultsContainer.innerHTML = '';
            
            if (!Array.isArray(users) || users.length === 0) {
                resultsContainer.innerHTML = '<p>未找到匹配的用户</p>';
                return;
            }
            
            users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.username}</div>
                            <div class="user-email">${user.email}</div>
                            <div class="register-date">注册于 ${new Date(user.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm" onclick="FamilyPark.Friends.sendFriendRequest('${user._id}')">添加好友</button>
                    </div>
                `;
                resultsContainer.appendChild(userCard);
            });
        } catch (error) {
            console.error('❌ 显示搜索结果错误:', error);
        }
    },
    
    // 发送好友请求
    async sendFriendRequest(userId) {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/friends/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetUserId: userId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification('好友请求已发送', 'success');
            } else {
                FamilyPark.showNotification(data.message || '发送失败', 'error');
            }
        } catch (error) {
            console.error('发送好友请求错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 处理好友请求
    async respondFriendRequest(requestId, action) {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/friends/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ requestId, action })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                FamilyPark.showNotification(data.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('处理好友请求错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 删除好友
    async deleteFriend(friendId) {
        try {
            if (!confirm('确定要删除这个好友吗？')) return;
            
            const response = await fetch(`${FamilyPark.getApiBase()}/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                FamilyPark.showNotification(data.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除好友错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

console.log('👥 好友系统模块加载完成');