// frontend/src/components/MysteryCard/ConnectionStatus.js
import React from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { text: '已连接', color: '#4caf50', icon: '🟢' };
      case 'connecting':
        return { text: '连接中...', color: '#ff9800', icon: '🟡' };
      case 'disconnected':
        return { text: '未连接', color: '#f44336', icon: '🔴' };
      case 'error':
        return { text: '连接错误', color: '#f44336', icon: '❌' };
      case 'simulation':
        return { text: '离线模式', color: '#2196f3', icon: '📱' };
      default:
        return { text: '未知状态', color: '#9e9e9e', icon: '❓' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className="connection-status"
      style={{ borderColor: statusInfo.color }}
    >
      <span className="status-icon">{statusInfo.icon}</span>
      <span className="status-text">{statusInfo.text}</span>
    </div>
  );
};

export default ConnectionStatus;
