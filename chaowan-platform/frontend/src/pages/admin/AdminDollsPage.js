import React, { useState, useEffect } from 'react';
import './AdminDollsPage.css';

const AdminDollsPage = ({ user, onUpdateUser }) => {
  const [dolls, setDolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 暂时显示占位内容，因为后端还没有娃娃管理API
    setLoading(false);
  }, []);

  return (
    <div className="admin-dolls-page">
      <div className="admin-header">
        <h1>🧸 娃娃管理</h1>
      </div>

      <div className="admin-placeholder">
        <h2>🧸 娃娃管理功能</h2>
        <p>此功能需要后端提供相应的娃娃管理API。</p>
        <div className="placeholder-content">
          <h3>📋 需要的后端API:</h3>
          <ul>
            <li>GET /api/admin/dolls - 获取娃娃列表</li>
            <li>POST /api/admin/dolls - 创建新娃娃</li>
            <li>PUT /api/admin/dolls/:id - 更新娃娃信息</li>
            <li>DELETE /api/admin/dolls/:id - 删除娃娃</li>
          </ul>
          
          <h3>🔧 当前状态:</h3>
          <p>✅ 前端路由已配置</p>
          <p>✅ 页面组件已创建</p>
          <p>⏳ 等待后端API开发</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDollsPage;
