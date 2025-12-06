// frontend/src/pages/admin/AdminAnalyticsPage.js
import React, { useState, useEffect } from 'react';
// 👇 从我们即将修复的 adminService.js 导入函数
import { getAnalytics } from '../../services/adminService';
import './AdminPage.css'; // 引入通用样式

const AdminAnalyticsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('7d'); // 默认显示最近7天

    useEffect(() => {
        fetchAnalytics();
    }, [period]); // 当 period 改变时，重新获取数据

    const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getAnalytics(period); // 调用API
            setData(res.data.data);
        } catch (err) {
            console.error('获取分析数据失败:', err);
            setError('获取数据失败，请检查网络或权限');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="admin-page-container">
            <h1>数据分析</h1>
            
            {/* 时间范围选择器 */}
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="period-select">选择时间范围: </label>
                <select 
                    id="period-select"
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)}
                    style={{ padding: '5px' }}
                >
                    <option value="1d">最近1天</option>
                    <option value="7d">最近7天</option>
                    <option value="30d">最近30天</option>
                </select>
            </div>

            {loading && <p>加载中...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            {data && (
                <div style={{ marginTop: '20px' }}>
                    <h2>用户注册趋势</h2>
                    <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(data.userRegistrationTrend, null, 2)}
                    </pre>
                    
                    <h2>交易趋势</h2>
                    <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(data.transactionTrend, null, 2)}
                    </pre>
                    
                    <h2>用户等级分布</h2>
                    <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(data.levelDistribution, null, 2)}
                    </pre>

                    <h2>积分分布统计</h2>
                    <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(data.pointsDistribution, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default AdminAnalyticsPage;
