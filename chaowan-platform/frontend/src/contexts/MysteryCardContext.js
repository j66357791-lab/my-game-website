// frontend/src/contexts/MysteryCardContext.js - 完整修复版
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MysteryCardContext = createContext();

export const useMysteryCard = () => useContext(MysteryCardContext);

export const MysteryCardProvider = ({ children }) => {
  const [gameState, setGameState] = useState(null);
  const [wsService, setWsService] = useState(null);
  const [lastSettlement, setLastSettlement] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [listenerId, setListenerId] = useState(null);

  // 🔧 关键修复：确保消息正确处理
  const handleMessage = useCallback((message) => {
    console.log('🎮 Context处理游戏消息:', message.type);
    
    switch (message.type) {
      case 'GAME_STATE':
        setGameState(prevState => {
          if (message.payload.currentPhase === 'SETTLEMENT') {
            setLastSettlement(message.payload.results);
          }
          return message.payload;
        });
        break;
        
      case 'SETTLEMENT':
        setLastSettlement(message.payload);
        setGameState(prevState => ({
          ...prevState,
          currentPhase: 'SETTLEMENT',
          results: message.payload
        }));
        break;
        
      case 'BET_SUCCESS':
        console.log('✅ 下注成功:', message.payload);
        break;
        
      case 'ERROR':
        console.error('❌ 游戏错误:', message.payload);
        setError(message.payload);
        break;
        
      case 'CONNECTED':
        setConnectionStatus('connected');
        setError(null);
        break;
        
      case 'DISCONNECTED':
        setConnectionStatus('disconnected');
        setError('连接已断开');
        break;
        
      default:
        console.log('📨 未知消息类型:', message.type);
    }
  }, []);

  // 🔧 关键修复：确保 WebSocket 服务正确设置
  const setWebSocketService = useCallback((service) => {
    if (wsService) {
      // 🔧 先移除旧的监听器
      if (listenerId) {
        wsService.removeListener(listenerId);
      }
    }
    
    setWsService(service);
    
    if (service) {
      // 🔧 添加新的监听器
      const newListenerId = service.addListener(handleMessage);
      setListenerId(newListenerId);
      
      // 🔧 确保连接成功时请求状态
      service.addListener((message) => {
        if (message.type === 'CONNECTED') {
          service.getGameState();
        }
      });
      
      return () => {
        if (service) {
          service.removeListener(newListenerId);
        }
      };
    }
  }, [handleMessage, wsService, listenerId]);

  // 🔧 修复：重连机制
  const reconnect = useCallback(() => {
    if (wsService && connectionStatus === 'disconnected') {
      console.log('🔄 尝试重新连接...');
      wsService.connect();
    }
  }, [wsService, connectionStatus]);

  // 🔧 修复：自动重连
  useEffect(() => {
    if (connectionStatus === 'disconnected' && wsService) {
      const timer = setTimeout(() => {
        reconnect();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, wsService, reconnect]);

  const value = {
    gameState,
    setWebSocketService,
    lastSettlement,
    connectionStatus,
    error,
    reconnect
  };

  return (
    <MysteryCardContext.Provider value={value}>
      {children}
    </MysteryCardContext.Provider>
  );
};
