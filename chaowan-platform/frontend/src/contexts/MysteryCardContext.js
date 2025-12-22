// frontend/src/contexts/MysteryCardContext.js - 优化版
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const MysteryCardContext = createContext();

export const MysteryCardProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    currentPhase: 'PREPARE',
    timeRemaining: 30,
    roundNumber: 1,
    lordCard: null,
    generalsCards: { east: null, south: null, west: null, north: null },
    totalBets: 0,
    userBets: [],
    gameHistory: [],
    isConnected: false,
    isGameActive: false,
    canBet: false,
    results: null,
    error: null
  });

  // 使用ref来持有wsService实例
  const wsServiceRef = useRef(null);
  const listenerIdRef = useRef(null);

  // 更新游戏状态
  const updateGameState = useCallback((updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message) => {
    console.log('🎮 处理游戏消息:', message);
    
    switch (message.type) {
      case 'CONNECTED':
        updateGameState({ isConnected: true, error: null });
        break;
        
      case 'DISCONNECTED':
        updateGameState({ isConnected: false, error: '连接已断开' });
        break;
        
      case 'GAME_STATE':
        const gameData = message.payload;
        console.log('✅ 收到游戏状态，更新界面');
        updateGameState({
          currentPhase: gameData.currentPhase || 'PREPARE',
          timeRemaining: gameData.timeRemaining || 30,
          roundNumber: gameData.roundNumber || 1,
          lordCard: gameData.lordCard || null,
          generalsCards: gameData.generalsCards || { east: null, south: null, west: null, north: null },
          totalBets: gameData.totalBets || 0,
          userBets: gameData.userBets || [],
          isGameActive: gameData.currentPhase !== 'PREPARE',
          canBet: gameData.currentPhase === 'BETTING',
          isConnected: true, // 🔧 关键：收到游戏状态就认为连接正常
          error: null
        });
        break;
        
      case 'BET_SUCCESS':
        const betData = message.payload;
        updateGameState(prev => ({
          totalBets: prev.totalBets + betData.amount,
          userBets: [...prev.userBets, { ...betData }]
        }));
        break;
        
      case 'SETTLEMENT':
        const settlementData = message.payload;
        updateGameState({
          results: settlementData
        });
        break;
        
      case 'HISTORY':
        updateGameState({ gameHistory: message.payload });
        break;
        
      case 'ERROR':
        updateGameState({ error: message.message });
        break;
        
      default:
        console.log('📨 未处理的消息类型:', message.type);
    }
  }, [updateGameState]);

  // 设置WebSocket服务实例
  const setWebSocketService = useCallback((service) => {
    // 清理旧的服务
    if (wsServiceRef.current && listenerIdRef.current) {
      wsServiceRef.current.removeListener(listenerIdRef.current);
    }

    wsServiceRef.current = service;
    
    if (service) {
      // 添加消息监听器
      const listenerId = service.addListener(handleWebSocketMessage);
      listenerIdRef.current = listenerId;
      
      // 返回一个清理函数
      return () => {
        if (service.removeListener) {
          service.removeListener(listenerId);
        }
      };
    }
    
    return () => {}; // 返回空的清理函数
  }, [handleWebSocketMessage]);

  // 游戏操作方法
  const placeBet = useCallback((general, amount) => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected() && gameState.canBet) {
      return wsServiceRef.current.placeBet(general, amount);
    }
    return false;
  }, [gameState.canBet]);

  const getGameState = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      return wsServiceRef.current.getGameState();
    }
    return false;
  }, []);

  const getHistory = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      return wsServiceRef.current.getHistory();
    }
    return false;
  }, []);

  const value = {
    gameState,
    setWebSocketService,
    updateGameState,
    placeBet,
    getGameState,
    getHistory,
    wsService: wsServiceRef.current
  };

  return (
    <MysteryCardContext.Provider value={value}>
      {children}
    </MysteryCardContext.Provider>
  );
};

export const useMysteryCard = () => {
  const context = useContext(MysteryCardContext);
  if (!context) {
    throw new Error('useMysteryCard must be used within MysteryCardProvider');
  }
  return context;
};