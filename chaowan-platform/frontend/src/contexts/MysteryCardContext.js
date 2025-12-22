// frontend/src/contexts/MysteryCardContext.js - 最终修复版
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
    // 新增：这两个字段必须初始化，否则组件渲染会报错
    totalBetsByPosition: { east: 0, south: 0, west: 0, north: 0 },
    revealStep: 0, 
    userBets: [],
    gameHistory: [],
    isConnected: false,
    isGameActive: false,
    canBet: false,
    results: null,
    error: null
  });

  const wsServiceRef = useRef(null);
  const listenerIdRef = useRef(null);

  const updateGameState = useCallback((updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleWebSocketMessage = useCallback((message) => {
    console.log('🎮 Context处理游戏消息:', message);
    
    switch (message.type) {
      case 'CONNECTED':
        updateGameState({ isConnected: true, error: null });
        break;
        
      case 'DISCONNECTED':
        updateGameState({ isConnected: false, error: '连接已断开' });
        break;
        
      case 'GAME_STATE':
        const gameData = message.payload;
        updateGameState({
          currentPhase: gameData.currentPhase || 'PREPARE',
          timeRemaining: gameData.timeRemaining || 30,
          roundNumber: gameData.roundNumber || 1,
          lordCard: gameData.lordCard || null,
          generalsCards: gameData.generalsCards || { east: null, south: null, west: null, north: null },
          totalBets: gameData.totalBets || 0,
          
          // 🔧 关键修复：接收后端发来的翻牌步骤和位置下注额
          totalBetsByPosition: gameData.totalBetsByPosition || { east: 0, south: 0, west: 0, north: 0 },
          revealStep: gameData.revealStep || 0,
          
          userBets: gameData.userBets || [],
          isGameActive: gameData.currentPhase !== 'PREPARE',
          canBet: gameData.currentPhase === 'BETTING',
          isConnected: true,
          error: null
        });
        break;
        
      case 'BET_SUCCESS':
        // 后端紧接着会发 GAME_STATE，这里可以只做提示，或者合并
        // 为了保险，这里只更新 userBets，让 GAME_STATE 处理总数据
        const betData = message.payload;
        updateGameState(prev => ({
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

  const setWebSocketService = useCallback((service) => {
    if (wsServiceRef.current && listenerIdRef.current) {
      wsServiceRef.current.removeListener(listenerIdRef.current);
    }

    wsServiceRef.current = service;
    
    if (service) {
      const listenerId = service.addListener(handleWebSocketMessage);
      listenerIdRef.current = listenerId;
      
      return () => {
        if (service.removeListener) {
          service.removeListener(listenerId);
        }
      };
    }
    
    return () => {}; 
  }, [handleWebSocketMessage]);

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
