// 家庭乐园前端JavaScript - 饲料商城模块
console.log('🛒 饲料商城模块加载中...');

// 扩展FamilyPark命名空间 - 饲料商城功能
FamilyPark.FeedShop = {
    // 加载饲料商城数据
    async loadFeedShopData() {
        console.log('🛒 加载饲料商城数据...');
        
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/feed-shop`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.feedShopItems = data.feeds || [];
                this.displayFeedShop();
            }
        } catch (error) {
            console.error('❌ 加载饲料商城数据错误:', error);
        }
    },
    
    // 显示饲料商城
    displayFeedShop() {
        try {
            console.log('🛒 显示饲料商城');
            
            const shopContainer = document.getElementById('feed-shop-container');
            if (!shopContainer) return;
            
            shopContainer.innerHTML = '';
            
            if (FamilyPark.feedShopItems.length === 0) {
                shopContainer.innerHTML = '<p>商城暂无商品</p>';
                return;
            }
            
            FamilyPark.feedShopItems.forEach(feed => {
                const feedCard = document.createElement('div');
                feedCard.className = 'feed-card';
                
                const growthText = feed.isSpecial ? 
                    `${feed.minGrowth}-${feed.maxGrowth}` : feed.growthValue;
                
                feedCard.innerHTML = `
                    <div class="feed-header">
                        <h3>${feed.name}</h3>
                        <div class="feed-price">${feed.price} 积分</div>
                    </div>
                    <div class="feed-body">
                        <div class="feed-feature">
                            <i class="fas fa-seedling"></i>
                            <span>成长值: ${growthText}</span>
                        </div>
                        <div class="feed-feature">
                            <i class="fas fa-info-circle"></i>
                            <span>${feed.description}</span>
                        </div>
                        <div class="feed-purchase">
                            <div class="form-group">
                                <label class="form-label">购买数量</label>
                                <input type="number" id="feed-quantity-${feed._id}" class="form-control" min="1" max="100" value="1">
                            </div>
                            <button class="btn btn-success btn-block" onclick="FamilyPark.FeedShop.buyFeed('${feed._id}')">
                                购买
                            </button>
                        </div>
                    </div>
                `;
                
                shopContainer.appendChild(feedCard);
            });
        } catch (error) {
            console.error('❌ 显示饲料商城错误:', error);
        }
    },
    
    // 购买饲料
    async buyFeed(feedId) {
        try {
            const quantityInput = document.getElementById(`feed-quantity-${feedId}`);
            const quantity = parseInt(quantityInput?.value) || 1;
            
            if (quantity < 1 || quantity > 100) {
                alert('购买数量必须在1-100之间！');
                return;
            }
            
            const response = await fetch(`${FamilyPark.getApiBase()}/family/buy-feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    feedId: feedId,
                    quantity: quantity
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
            } else {
                FamilyPark.showNotification(data.message || '购买失败', 'error');
            }
        } catch (error) {
            console.error('❌ 购买饲料错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

console.log('🛒 饲料商城模块加载完成');
