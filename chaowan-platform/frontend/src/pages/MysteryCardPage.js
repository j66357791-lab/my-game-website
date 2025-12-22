// frontend/src/pages/MysteryCardPage.js - 修复版
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

// 简单的全局加载弹窗组件
const LoadingModal = ({ message }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalContent}>
      <div style={styles.spinner}></div>
      <p>{message}</p>
    </div>
  </div>
);

const MysteryCardPage = ({ user, onUpdateUser, globalPoints, globalCash, globalDolls, syncUserData }) => {
  const { token } = useUser();
  const { gameState, setWebSocketService } = useMysteryCard();
  const navigate = useNavigate();
  
  const wsRef = useRef(null);
  const cleanupListenerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('正在连接服务器...');
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    console.log('🔗 初始化 WebSocket 连接...');
    const ws = new WebSocketService(token);
    wsRef.current = ws;

    // 设置服务到 Context（setWebSocketService 来自 Context，不会变化，无需作为依赖）
    cleanupListenerRef.current = setWebSocketService(ws);
    
    ws.connect();

    // 监听连接状态和初始数据加载
    const handleInitialLoad = (message) => {
      if (message.type === 'CONNECTED') {
        setLoadingMessage('连接成功！正在同步游戏数据...');
        // 请求历史数据
        ws.getHistory();
      }
      // 当收到第一个 GAME_STATE 和 HISTORY 时，认为初始加载完成
      if (message.type === 'GAME_STATE' && !isInitialDataLoaded) {
        setIsInitialDataLoaded(true);
      }
      if (message.type === 'HISTORY' && isInitialDataLoaded) {
        setIsLoading(false);
      }
    };
    
    const listenerId = ws.addListener(handleInitialLoad);

    // 清理函数（仅在组件卸载时执行）
    return () => {
      console.log('🔌 清理 WebSocket 连接');
      if (cleanupListenerRef.current) {
        cleanupListenerRef.current(); // 清理 Context 中的监听器
      }
      if (wsRef.current) {
        wsRef.current.removeListener(listenerId); // 清理本页面的监听器
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [user, token, navigate]); // 🔧 移除 setWebSocketService，避免重复执行

  const handleBet = (general, amount) => {
    console.log('💰 下注:', general, amount);
  };

  if (!user) {
    return <div>正在验证用户身份...</div>;
  }

  return (
    <div className="mystery-card-page">
      {isLoading && <LoadingModal message={loadingMessage} />}
      <div className="game-container">
        <GameBoard 
          gameState={gameState}
          onBet={handleBet}
        />
      </div>
    </div>
  );
};

// 简单的样式
const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    background: '#fff',
    padding: '30px 40px',
    borderRadius: '10px',
    textAlign: 'center',
    color: '#333',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  }
};

// 添加旋转动画
const styleSheet = document.styleSheets[0];
const keyframesRule = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
styleSheet.insertRule(keyframesRule, styleSheet.cssRules.length);

export default MysteryCardPage;
