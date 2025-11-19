// 🔧 完全重写的 app.js - 解决所有语法和变量冲突问题
(function() {
    'use strict';
    
    console.log('🌐 API基础地址:', CONFIG.API_BASE);
    console.log('🚀 当前环境:', window.location.hostname);

    // 🔧 避免变量重复声明 - 检查是否已存在
    if (typeof window.currentUser === 'undefined') {
        window.currentUser = null;
    }
    if (typeof window.userDolls === 'undefined') {
        window.userDolls = [];
    }
    if (typeof window.allUsers === 'undefined') {
        window.allUsers = [];
    }
    if (typeof window.selectedDollsForSynthesis === 'undefined') {
        window.selectedDollsForSynthesis = [null, null];
    }
    if (typeof window.autoIncomeTimer === 'undefined') {
        window.autoIncomeTimer = null;
    }
    if (typeof window.lastPayoutTime === 'undefined') {
        window.lastPayoutTime = null;
    }
    if (typeof window.selectedRecipient === 'undefined') {
        window.selectedRecipient = null;
    }

    // DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('初始化娃娃收藏游戏...');
        
        // 延迟初始化，确保所有脚本都加载完成
        setTimeout(function() {
            initializeApp();
        }, 100);
    });

    // 初始化应用
    function initializeApp() {
        console.log('开始初始化应用...');
        
        // 检查必要的全局变量
        if (typeof CONFIG === 'undefined') {
            console.error('CONFIG未定义');
            return;
        }
        
        // 初始化事件监听器
        initEventListeners();
        
        // 检查登录状态
        if (typeof Auth !== 'undefined') {
            Auth.checkLoginStatus();
        } else {
            console.error('Auth模块未加载');
            // 显示登录模态框
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.style.display = 'flex';
            }
        }
        
        // 启动自动收益系统
        if (typeof AutoIncome !== 'undefined') {
            AutoIncome.startAutoIncomeSystem();
        }
        
        // 检查服务器连接状态
        checkServerStatus();
        
        console.log('应用初始化完成');
    }

    // 初始化所有事件监听器
    function initEventListeners() {
        console.log('初始化事件监听器...');
        
        // 导航链接
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const panelId = this.getAttribute('data-panel');
                console.log('切换面板:', panelId);
                showPanel(panelId);
            });
        });
        
        // 初始化各模块事件监听器
        try {
            if (typeof Auth !== 'undefined') {
                Auth.initEventListeners();
            }
            
            if (typeof Dolls !== 'undefined') {
                Dolls.initEventListeners();
            }
            
            if (typeof Synthesis !== 'undefined') {
                Synthesis.initEventListeners();
            }
            
            if (typeof Transfer !== 'undefined') {
                Transfer.initEventListeners();
            }
            
            if (typeof Admin !== 'undefined') {
                Admin.initEventListeners();
            }
            
            console.log('所有模块事件监听器初始化完成');
        } catch (error) {
            console.error('初始化事件监听器时出错:', error);
        }
    }

    // 🔧 关键修复：显示面板函数
    function showPanel(panelId) {
        console.log('显示面板:', panelId);
        
        // 检查用户是否登录
        if (!window.currentUser) {
            console.log('用户未登录，显示登录模态框');
            if (typeof Auth !== 'undefined') {
                Auth.showLoginModal();
            } else {
                // 直接显示登录模态框
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                }
            }
            return;
        }
        
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示选中的面板
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('✅ 面板显示成功:', panelId);
        } else {
            console.error('❌ 找不到面板:', panelId);
            return;
        }
        
        // 更新导航链接状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // 加载特定面板的数据 - 增加错误处理
        try {
            if (panelId === 'synthesis-panel') {
                if (typeof Synthesis !== 'undefined') {
                    console.log('加载合成面板数据...');
                    Synthesis.updateAvailableDolls();
                    Synthesis.loadSynthesisRecords();
                } else {
                    console.error('❌ Synthesis模块未定义');
                }
            } else if (panelId === 'transfer-panel') {
                if (typeof Transfer !== 'undefined') {
                    console.log('加载转增面板数据...');
                    Transfer.loadTransferRecords();
                } else {
                    console.error('❌ Transfer模块未定义');
                }
            } else if (panelId === 'admin-panel' && window.currentUser && window.currentUser.role === 'admin') {
                if (typeof Admin !== 'undefined') {
                    console.log('加载管理员面板数据...');
                    Admin.loadAdminData();
                } else {
                    console.error('❌ Admin模块未定义');
                }
            }
        } catch (error) {
            console.error('❌ 加载面板数据时出错:', error);
        }
    }

    // 检查服务器状态
    async function checkServerStatus() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/health`);
            if (response.ok) {
                const statusElement = document.getElementById('server-status');
                if (statusElement) {
                    statusElement.textContent = '在线';
                    statusElement.style.color = 'green';
                }
            } else {
                const statusElement = document.getElementById('server-status');
                if (statusElement) {
                    statusElement.textContent = '离线';
                    statusElement.style.color = 'red';
                }
            }
        } catch (error) {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = '连接失败';
                statusElement.style.color = 'red';
            }
            console.error('服务器连接失败:', error);
        }
    }

    // UI更新相关
    const UI = {
        // 更新UI
        updateUI() {
            console.log('更新UI...');
            
            if (window.currentUser) {
                const userPoints = document.getElementById('user-points');
                if (userPoints) {
                    userPoints.textContent = window.currentUser.points.toFixed(2) + ' 积分';
                }
                
                const userAvatar = document.getElementById('user-avatar');
                if (userAvatar) {
                    userAvatar.innerHTML = `<i class="fas fa-user"></i> ${window.currentUser.username.charAt(0).toUpperCase()}`;
                }
                
                const adminLink = document.getElementById('admin-link');
                if (adminLink) {
                    adminLink.style.display = window.currentUser.role === 'admin' ? 'block' : 'none';
                }
                
                // 显示用户区域，隐藏登录区域
                const userArea = document.getElementById('user-area');
                const loginArea = document.getElementById('login-area');
                if (userArea && loginArea) {
                    userArea.style.display = 'flex';
                    loginArea.style.display = 'none';
                }
                
                // 显示用户角色
                const userRole = document.querySelector('.user-role');
                if (userRole) {
                    userRole.innerHTML = `
                        <span class="user-role">
                            <span class="role-badge ${window.currentUser.role}">
                                ${window.currentUser.role === 'merchant' ? '<i class="fas fa-crown"></i> 商人' : window.currentUser.role === 'admin' ? '<i class="fas fa-user-shield"></i> 管理员' : '<i class="fas fa-user"></i> 用户'}
                            </span>
                        </span>
                    `;
                }
            } else {
                const userPoints = document.getElementById('user-points');
                if (userPoints) {
                    userPoints.textContent = '0.00 积分';
                }
                
                const userAvatar = document.getElementById('user-avatar');
                if (userAvatar) {
                    userAvatar.innerHTML = '<i class="fas fa-user"></i>';
                }
                
                const adminLink = document.getElementById('admin-link');
                if (adminLink) {
                    adminLink.style.display = 'none';
                }
                
                // 显示登录区域，隐藏用户区域
                const userArea = document.getElementById('user-area');
                const loginArea = document.getElementById('login-area');
                if (userArea && loginArea) {
                    userArea.style.display = 'none';
                    loginArea.style.display = 'flex';
                }
            }
            
            console.log('✅ UI更新完成');
        }
    };

    // 🔧 关键修复：导出全局函数
    window.showPanel = showPanel;
    window.UI = UI;
    
    console.log('✅ app.js 加载完成');
})();
