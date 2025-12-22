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

const MysteryCardPage = ({ user, onUpdateUser, globalPoints, globalCash, globalDolls, syncUserData }) => {
  const { token } = useUser();
  const { gameState, setWebSocketService, updateGameState } = useMysteryCard();
  const navigate = useNavigate();
  
  const wsRef = useRef(null);
  const cleanupListenerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('正在连接服务器...');
  const [hasReceivedGameState, setHasReceivedGameState] = useState(false);
  
  // 本地状态，防止直接使用可能为 undefined 的 props
  const currentUser = user || { points: 0 };

  // 🔧 修复：处理WebSocket连接
  useEffect(() => {
    if (!currentUser || !token) {
      navigate('/login');
      return;
    }

    console.log('🔗 初始化WebSocket连接...');
    const ws = new WebSocketService(token);
    wsRef.current = ws;

    // 设置服务到Context
    cleanupListenerRef.current = setWebSocketService(ws);
    
    // 添加消息监听器
    const listenerId = ws.addListener((message) => {
      console.log('📨 页面收到消息:', message.type);
      
      // 🔧 关键修复：只要收到GAME_STATE就认为连接成功
      if (message.type === 'GAME_STATE') {
        console.log('✅ 收到游戏状态，可以显示界面了');
        setHasReceivedGameState(true);
        setIsLoading(false);
        updateGameState(message.payload);
      }
      
      // 可选：处理连接成功消息
      if (message.type === 'CONNECTED') {
        setLoadingMessage('连接成功！正在获取游戏数据...');
      }
      
      // 可选：请求历史记录
      if (message.type === 'CONNECTED' || message.type === 'GAME_STATE') {
        // 延迟请求历史，避免网络拥堵
        setTimeout(() => {
          ws.getHistory();
        }, 1000);
      }
      
      // 【核心修复 5】处理下注成功 -> 更新用户积分
      if (message.type === 'BET_SUCCESS') {
        const { newBalance } = message.payload;
        if (newBalance !== undefined) {
          // 优先使用 onUpdateUser（如果提供了的话），否则使用全局方法
          if (onUpdateUser) {
            onUpdateUser({ points: newBalance });
          } else if (syncUserData) {
            syncUserData({ points: newBalance });
          }
          console.log('✅ 下注成功，余额已更新:', newBalance);
        }
      }

      // 【核心修复 5】处理结算结果 -> 更新用户积分
      if (message.type === 'SETTLEMENT') {
        const { newBalance, results } = message.payload;
        if (newBalance !== undefined) {
          if (onUpdateUser) {
            onUpdateUser({ points: newBalance });
          } else if (syncUserData) {
            syncUserData({ points: newBalance });
          }
          console.log('✅ 结算完成，余额已更新:', newBalance);
        }
        
        // 将结算结果存入 gameState 供 ResultModal 使用
        updateGameState({ lastSettlement: message.payload });
      }
      
      // 错误处理
      if (message.type === 'ERROR') {
        console.error('游戏错误:', message.message);
        updateGameState({ error: message.message });
      }
    });
    
    ws.connect();

    // 设置超时检查，防止永远卡在加载状态
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ 连接超时，强制显示界面');
        setIsLoading(false);
      }
    }, 15000); // 15秒超时

    // 🔧 清理函数
    return () => {
      clearTimeout(timeoutId);
      console.log('🔌 清理WebSocket连接');
      if (cleanupListenerRef.current) {
        cleanupListenerRef.current();
      }
      if (wsRef.current) {
        wsRef.current.removeListener(listenerId);
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [currentUser, token, navigate, isLoading, setWebSocketService, onUpdateUser, syncUserData, updateGameState]);

  // 🔧 修复：额外检查游戏状态，确保不会卡住
  useEffect(() => {
    // 如果已经有游戏状态数据，确保不显示加载
    if (gameState && gameState.currentPhase) {
      setIsLoading(false);
    }
  }, [gameState]);

  const handleBet = (general, amount) => {
    console.log('💰 下注:', general, amount);
  };

  if (!currentUser) {
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
try {
  styleSheet.insertRule(keyframesRule, styleSheet.cssRules.length);
} catch (e) {
  // 防止重复插入报错
}

export default MysteryCardPage;
