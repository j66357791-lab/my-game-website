// frontend/src/contexts/MysteryCardContext.js - 修复版
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  const [wsService, setWsService] = useState(null);

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
        updateGameState({
          currentPhase: gameData.currentPhase || 'PREPARE',
          timeRemaining: gameData.timeRemaining || 30,
          roundNumber: gameData.roundNumber || 1,
          lordCard: gameData.lordCard || null,
          generalsCards: gameData.generalsCards || { east: null, south: null, west: null, north: null },
          totalBets: gameData.totalBets || 0,
          userBets: gameData.userBets || [],
          isGameActive: gameData.currentPhase !== 'PREPARE',
          canBet: gameData.currentPhase === 'BETTING'
        });
        break;
        
      case 'BET_SUCCESS':
        const betData = message.payload;
        updateGameState(prev => ({
          totalBets: prev.totalBets + betData.amount,
          userBets: [...prev.userBets, betData]
        }));
        break;
        
      case 'SETTLEMENT':
        const settlementData = message.payload;
        updateGameState({
          currentPhase: 'SETTLEMENT',
          results: settlementData
        });
        break;
        
      case 'ERROR':
        updateGameState({ error: message.message });
        break;
        
      default:
        console.log('📨 未处理的消息类型:', message.type);
    }
  }, [updateGameState]);

  // 🔧 关键修复：防止重复设置WebSocket服务
  const setWebSocketService = useCallback((service) => {
    if (wsService && wsService !== service) {
      console.log('🔌 清理旧的WebSocket服务');
      wsService.listeners.clear();
    }
    
    setWsService(service);
    
    if (service && !service.listeners.has(handleWebSocketMessage)) {
      service.addListener(handleWebSocketMessage);
    }
  }, [wsService, handleWebSocketMessage]);

  // 游戏操作方法
  const placeBet = useCallback((general, amount) => {
    if (wsService && wsService.isConnected() && gameState.canBet) {
      return wsService.placeBet(general, amount);
    }
    return false;
  }, [wsService, gameState.canBet]);

  const getGameState = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.getGameState();
    }
    return false;
  }, [wsService]);

  const getHistory = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.getHistory();
    }
    return false;
  }, [wsService]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (wsService) {
        wsService.disconnect();
      }
    };
  }, [wsService]);

  const value = {
    gameState,
    wsService,
    setWebSocketService,
    updateGameState,
    placeBet,
    getGameState,
    getHistory
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
