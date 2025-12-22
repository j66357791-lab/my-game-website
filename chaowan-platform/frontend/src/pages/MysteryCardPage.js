// frontend/src/pages/MysteryCardPage.js - 完整修复版
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

const MysteryCardPage = ({ user }) => {
  const { token } = useUser();
  const { gameState, setWebSocketService } = useMysteryCard();
  const navigate = useNavigate();
  
  const wsRef = useRef(null);
  const cleanupListenerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('正在连接服务器...');
  
  // 本地状态，防止直接使用可能为 undefined 的 props
  const currentUser = user || { points: 0 };

  // 🔧 添加 ref 来追踪是否已经初始化，防止重复连接
  const isInitializedRef = useRef(false);

  // 🔧 修复：处理WebSocket连接
  useEffect(() => {
    if (!currentUser || !token) {
      navigate('/login');
      return;
    }

    // 🔧 关键修复：防止重复初始化连接
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    console.log('🔗 初始化WebSocket连接...');
    const ws = new WebSocketService(token);
    wsRef.current = ws;

    // 设置服务到Context
    cleanupListenerRef.current = setWebSocketService(ws);
    
    // 添加消息监听器 (只监听初始化和错误，其他交给 Context)
    const listenerId = ws.addListener((message) => {
      console.log('📨 页面收到消息:', message.type);
      
      // 1. 处理连接成功 -> 移除加载
      if (message.type === 'CONNECTED' || message.type === 'GAME_STATE') {
        if (isLoading) {
          console.log('✅ 收到消息，移除加载界面');
          setIsLoading(false);
          setLoadingMessage('游戏进行中');
        }
      }
      
      // 2. 🔧 修复：只在连接成功时请求一次历史记录
      if (message.type === 'CONNECTED') {
        setTimeout(() => {
           if (ws.isConnected()) ws.getHistory();
        }, 500);
      }
      
      // 3. 错误处理
      if (message.type === 'ERROR') {
        console.error('游戏错误:', message.message);
        setIsLoading(false);
      }
    });
    
    ws.connect();

    // 🔧 修复：设置超时检查
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ 连接超时，强制显示界面');
        setIsLoading(false);
      }
    }, 10000);

    // 🔧 修复：清理函数
    return () => {
      clearTimeout(timeoutId);
      console.log('🔌 清理Effect监听器');
      if (cleanupListenerRef.current) {
        cleanupListenerRef.current();
      }
      if (wsRef.current) {
        wsRef.current.removeListener(listenerId);
        // 注意：不要在这里 disconnect，否则组件更新时会导致断连
        // wsRef.current.disconnect(); 
      }
    };
  }, [currentUser, token, navigate]); // 🔧 移除 isLoading 依赖

  if (!currentUser) {
    return <div>正在验证用户身份...</div>;
  }

  return (
    <div className="mystery-card-page">
      {isLoading && <LoadingModal message={loadingMessage} />}
      <div className="game-container">
        <GameBoard 
          gameState={gameState}
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
try {
  styleSheet.insertRule(keyframesRule, styleSheet.cssRules.length);
} catch (e) {}

export default MysteryCardPage;
