// frontend/src/contexts/MysteryCardContext.js - 修复版
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const MysteryCardContext = createContext();

export const useMysteryCard = () => useContext(MysteryCardContext);

export const MysteryCardProvider = ({ children }) => {
  const [gameState, setGameState] = useState(null);
  const [wsService, setWsService] = useState(null);
  const [lastSettlement, setLastSettlement] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [listenerId, setListenerId] = useState(null);

  // 🔧 新增：使用 Ref 保存内部监听器的 ID，确保能被清理
  const internalListenerIdRef = useRef(null);

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

  const setWebSocketService = useCallback((service) => {
    // 1. 清理旧的主监听器
    if (wsService && listenerId) {
      wsService.removeListener(listenerId);
    }
    
    // 2. 🔧 关键修复：清理旧的内部监听器（防止泄漏）
    if (wsService && internalListenerIdRef.current) {
      wsService.removeListener(internalListenerIdRef.current);
      internalListenerIdRef.current = null;
    }
    
    setWsService(service);
    
    if (service) {
      // 3. 添加新的主监听器
      const newListenerId = service.addListener(handleMessage);
      setListenerId(newListenerId);
      
      // 4. 🔧 关键修复：添加内部监听器并保存 ID
      const newInternalId = service.addListener((message) => {
        if (message.type === 'CONNECTED') {
          service.getGameState();
        }
      });
      internalListenerIdRef.current = newInternalId;
      
      return () => {
        if (service) {
          service.removeListener(newListenerId);
          if (internalListenerIdRef.current) {
            service.removeListener(internalListenerIdRef.current);
          }
        }
      };
    }
  }, [handleMessage, wsService, listenerId]);

  const reconnect = useCallback(() => {
    if (wsService && connectionStatus === 'disconnected') {
      console.log('🔄 尝试重新连接...');
      wsService.connect();
    }
  }, [wsService, connectionStatus]);

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
    wsService, // 🔧 确保导出 wsService
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
