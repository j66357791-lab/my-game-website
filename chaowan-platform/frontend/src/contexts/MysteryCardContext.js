// frontend/src/contexts/MysteryCardContext.js - 修复刷屏版
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
        // 🔧 修复：只在连接成功时请求一次历史记录
        if (wsServiceRef.current) {
          wsServiceRef.current.getHistory();
        }
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
          totalBetsByPosition: gameData.totalBetsByPosition || { east: 0, south: 0, west: 0, north: 0 },
          revealStep: gameData.revealStep || 0,
          userBets: gameData.userBets || [],
          isGameActive: gameData.currentPhase !== 'PREPARE',
          canBet: gameData.currentPhase === 'BETTING',
          isConnected: true,
          error: null
        });
        
        // 🔧 移除：不再在这里自动请求历史记录，避免刷屏
        // if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
        //   wsServiceRef.current.getHistory();
        // }
        break;
        
      case 'BET_SUCCESS':
        const betData = message.payload;
        updateGameState(prev => ({
          userBets: [...prev.userBets, { ...betData }]
        }));
        break;
        
      case 'SETTLEMENT':
        const settlementData = message.payload;
        updateGameState({
          results: settlementData // 包含 newBalance
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
