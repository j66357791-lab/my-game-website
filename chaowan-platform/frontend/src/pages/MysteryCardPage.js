// frontend/src/pages/MysteryCardPage.js - 彻底修复版
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

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

  // 🔧 修复1：使用 ref 追踪是否已经初始化
  const isInitializedRef = useRef(false);
  
  // 🔧 修复2：使用 ref 追踪当前的 token，防止重复初始化
  const currentTokenRef = useRef(token);

  // 🔧 关键修复：处理WebSocket连接
  useEffect(() => {
    // 1. 如果没有 token，跳转登录
    if (!token) {
      navigate('/login');
      return;
    }

    // 🔧 修复3：如果 Token 变了（比如切换账号），必须重置并重新初始化
    if (token !== currentTokenRef.current) {
      console.log('🔄 Token 变化，重置连接状态');
      currentTokenRef.current = token;
      // 清理旧的连接（如果存在）
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      // 重置初始化标志
      isInitializedRef.current = false;
    }

    // 🔧 修复4：如果已经初始化且 Token 没变，直接返回（防止积分更新时重连！）
    if (isInitializedRef.current) {
      return;
    }

    console.log('🔗 初始化WebSocket连接...');
    isInitializedRef.current = true;

    const ws = new WebSocketService(token);
    wsRef.current = ws;

    // 设置服务到Context
    cleanupListenerRef.current = setWebSocketService(ws);
    
    // 添加消息监听器
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
      
      // 2. 处理连接成功 -> 请求历史记录
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

    // 🔧 修复5：设置超时检查
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ 连接超时，强制显示界面');
        setIsLoading(false);
      }
    }, 10000);

    // 🔧 修复6：清理函数（只在真正卸载或 Token 变化时执行）
    return () => {
      clearTimeout(timeoutId);
      console.log('🔌 清理Effect监听器');
      
      // 注意：这里只清理注册的监听器，不调用 disconnect
      // 因为 disconnect 应该只在 Token 变化或组件卸载时发生
      if (cleanupListenerRef.current) {
        cleanupListenerRef.current();
      }
      if (wsRef.current) {
        wsRef.current.removeListener(listenerId);
      }
    };
  }, [token, navigate]); // 🔧 核心修复：依赖项只保留 token 和 navigate，移除 currentUser！

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
