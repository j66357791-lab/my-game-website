// 系统管理模块
const SystemManager = {
    // 检查服务器状态
    async checkServerStatus() {
        try {
            const response = await fetch(`${AppState.API_BASE}/health`);
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
    },

    // 导出数据
    exportData(type) {
        const token = localStorage.getItem('token');
        window.open(`${AppState.API_BASE}/admin/export/${type}?token=${token}`, '_blank');
    }
};

// 导出到全局作用域
window.SystemManager = SystemManager;
