// frontend/src/contexts/MysteryCardContext.js - 修复无限循环版
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

  const internalListenerIdRef = useRef(null);
  const lastRoundRef = useRef(0);
  
  // 🔧 新增：使用 Ref 追踪 wsService 和 listenerId，避免依赖循环
  const wsServiceRef = useRef(null);
  const listenerIdRef = useRef(null);

  // 🔧 同步 State 到 Ref
  useEffect(() => {
    wsServiceRef.current = wsService;
  }, [wsService]);

  useEffect(() => {
    listenerIdRef.current = listenerId;
  }, [listenerId]);

  const handleMessage = useCallback((message) => {
    // console.log('🎮 Context处理游戏消息:', message.type);
    
    switch (message.type) {
      case 'GAME_STATE':
        setGameState(prevState => {
          const payload = message.payload;
          const newState = JSON.parse(JSON.stringify(payload));
          
          if (newState.roundNumber !== lastRoundRef.current) {
            console.log(`🔄 游戏轮次变更: ${lastRoundRef.current} -> ${newState.roundNumber}`);
            lastRoundRef.current = newState.roundNumber;
            newState._forceUpdate = Date.now();
          }

          if (newState.currentPhase === 'SETTLEMENT' && payload.results) {
            setLastSettlement(payload.results);
          }
          
          return newState;
        });
        break;
        
      case 'SETTLEMENT':
        const results = message.payload;
        setLastSettlement(results);
        
        setGameState(prevState => {
          return {
            ...(prevState || {}), 
            currentPhase: 'SETTLEMENT',
            results: JSON.parse(JSON.stringify(results)),
            _forceUpdate: Date.now()
          };
        });
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

  // 🔧 修复：移除对 wsService 和 listenerId 的依赖，使用 Ref 读取
  const setWebSocketService = useCallback((service) => {
    const currentWs = wsServiceRef.current;
    const currentListenerId = listenerIdRef.current;

    // 清理旧的监听器
    if (currentWs && currentListenerId) {
      currentWs.removeListener(currentListenerId);
    }
    if (currentWs && internalListenerIdRef.current) {
      currentWs.removeListener(internalListenerIdRef.current);
      internalListenerIdRef.current = null;
    }
    
    // 设置新的服务
    setWsService(service);
    
    if (service) {
      const newListenerId = service.addListener(handleMessage);
      setListenerId(newListenerId);
      
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
  }, [handleMessage]); // ✅ 依赖项变少了，函数引用稳定

  // 🔧 修复：reconnect 函数也使用 Ref 避免依赖
  const reconnect = useCallback(() => {
    const currentWs = wsServiceRef.current;
    if (currentWs && connectionStatus === 'disconnected') {
      console.log('🔄 尝试重新连接...');
      currentWs.connect();
    }
  }, [connectionStatus]); // ✅ 移除了 wsService 依赖

  useEffect(() => {
    if (connectionStatus === 'disconnected' && wsServiceRef.current) {
      const timer = setTimeout(() => {
        reconnect();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, reconnect]);

  const value = {
    gameState,
    setWebSocketService,
    wsService,
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
