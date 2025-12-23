// frontend/src/contexts/MysteryCardContext.js - 修复渲染死锁版
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
  // 🔧 新增：使用 ref 追踪上一期的轮数，用于强制刷新
  const lastRoundRef = useRef(0);

  const handleMessage = useCallback((message) => {
    // console.log('🎮 Context处理游戏消息:', message.type); // 可选：保留日志调试
    
    switch (message.type) {
      case 'GAME_STATE':
        setGameState(prevState => {
          const payload = message.payload;
          
          // 🔧 关键修复：强制深拷贝，打破引用依赖
          const newState = JSON.parse(JSON.stringify(payload));
          
          // 🔧 额外保险：如果轮数变了，强制更新时间戳触发渲染
          if (newState.roundNumber !== lastRoundRef.current) {
            console.log(`🔄 游戏轮次变更: ${lastRoundRef.current} -> ${newState.roundNumber}`);
            lastRoundRef.current = newState.roundNumber;
            // 添加一个隐形的随机属性，确保 React 认为是新对象
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
          // 🔧 关键修复：深拷贝新结果，并完全覆盖旧状态，防止残留
          // 这样下一轮 GAME_STATE 进来时，就是一张白纸
          return {
            ...(prevState || {}), 
            currentPhase: 'SETTLEMENT',
            results: JSON.parse(JSON.stringify(results)), // 深拷贝
            _forceUpdate: Date.now() // 强制刷新
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

  // ... 保持 setWebSocketService 和 reconnect 的逻辑不变 (使用之前的修复代码) ...
  
  const setWebSocketService = useCallback((service) => {
    if (wsService && listenerId) {
      wsService.removeListener(listenerId);
    }
    if (wsService && internalListenerIdRef.current) {
      wsService.removeListener(internalListenerIdRef.current);
      internalListenerIdRef.current = null;
    }
    
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
