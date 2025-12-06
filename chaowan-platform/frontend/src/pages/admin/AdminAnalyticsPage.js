import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../../services/adminService';
import './AdminPage.css';
const AdminAnalyticsPage = () => {
    const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [period, setPeriod] = useState('7d');
    useEffect(() => { fetchAnalytics(); }, [period]);
    const fetchAnalytics = async () => { setLoading(true); try { const res = await getAnalytics(period); setData(res.data.data); } catch (err) { console.error('获取分析数据失败:', err); } finally { setLoading(false); } };
    return (
        <div className="admin-page-container">
            <h1>数据分析</h1><div><label>选择时间范围: </label><select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="1d">最近1天</option><option value="7d">最近7天</option><option value="30d">最近30天</option></select></div>
            {loading ? <p>加载中...</p> : (<div style={{ marginTop: '20px' }}><h2>用户注册趋势</h2><pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>{JSON.stringify(data?.userRegistrationTrend, null, 2)}</pre><h2>交易趋势</h2><pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>{JSON.stringify(data?.transactionTrend, null, 2)}</pre></div>)}
        </div>
    );
};
export default AdminAnalyticsPage;
