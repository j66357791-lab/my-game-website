// frontend/src/contexts/MysteryCardContext.js - 真实游戏状态管理
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GAME_PHASES, GAME_CONFIG } from '../utils/gameConstants';

const MysteryCardContext = createContext();

export const MysteryCardProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    currentPhase: GAME_PHASES.PREPARE,
    timeRemaining: GAME_CONFIG.INITIAL_TIME,
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
          currentPhase: gameData.phase || GAME_PHASES.PREPARE,
          timeRemaining: gameData.timeRemaining || GAME_CONFIG.INITIAL_TIME,
          roundNumber: gameData.roundNumber || 1,
          lordCard: gameData.lordCard || null,
          generalsCards: gameData.generalsCards || { east: null, south: null, west: null, north: null },
          totalBets: gameData.totalBets || 0,
          userBets: gameData.userBets || [],
          isGameActive: gameData.isActive || false,
          canBet: gameData.canBet || false
        });
        break;
        
      case 'GAME_STARTED':
        updateGameState({
          isGameActive: true,
          currentPhase: GAME_PHASES.BETTING,
          timeRemaining: GAME_CONFIG.INITIAL_TIME,
          error: null
        });
        break;
        
      case 'BET_PLACED':
        const betData = message.payload;
        updateGameState(prev => ({
          totalBets: prev.totalBets + betData.amount,
          userBets: [...prev.userBets, betData]
        }));
        break;
        
      case 'BETS_LOCKED':
        updateGameState({
          currentPhase: GAME_PHASES.LOCKING,
          canBet: false
        });
        break;
        
      case 'CARDS_REVEALED':
        const cardsData = message.payload;
        updateGameState({
          currentPhase: GAME_PHASES.REVEALING,
          lordCard: cardsData.lordCard,
          generalsCards: cardsData.generalsCards
        });
        break;
        
      case 'GAME_SETTLED':
        const settlementData = message.payload;
        updateGameState({
          currentPhase: GAME_PHASES.SETTLEMENT,
          results: settlementData.results,
          gameHistory: [...gameState.gameHistory, {
            round: gameState.roundNumber,
            lordCard: settlementData.lordCard,
            generalsCards: settlementData.generalsCards,
            results: settlementData.results,
            timestamp: Date.now()
          }]
        });
        break;
        
      case 'ROUND_STARTED':
        const roundData = message.payload;
        updateGameState({
          currentPhase: GAME_PHASES.BETTING,
          roundNumber: roundData.roundNumber,
          timeRemaining: roundData.timeRemaining || GAME_CONFIG.INITIAL_TIME,
          lordCard: null,
          generalsCards: { east: null, south: null, west: null, north: null },
          totalBets: 0,
          userBets: [],
          canBet: true,
          results: null
        });
        break;
        
      case 'GAME_ERROR':
        updateGameState({ error: message.payload.message });
        break;
        
      default:
        console.log('📨 未处理的消息类型:', message.type);
    }
  }, [gameState.gameHistory, gameState.roundNumber, updateGameState]);

  // 设置WebSocket服务
  const setWebSocketService = useCallback((service) => {
    if (wsService) {
      // 移除旧的监听器
      wsService.listeners.clear();
    }
    
    setWsService(service);
    
    if (service) {
      // 添加新的监听器
      service.addListener(handleWebSocketMessage);
    }
  }, [wsService, handleWebSocketMessage]);

  // 游戏操作方法
  const startGame = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.startGame();
    }
    return false;
  }, [wsService]);

  const placeBet = useCallback((general, amount) => {
    if (wsService && wsService.isConnected() && gameState.canBet) {
      return wsService.placeBet(general, amount);
    }
    return false;
  }, [wsService, gameState.canBet]);

  const lockBets = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.lockBets();
    }
    return false;
  }, [wsService]);

  const revealCards = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.revealCards();
    }
    return false;
  }, [wsService]);

  const startNewRound = useCallback(() => {
    if (wsService && wsService.isConnected()) {
      return wsService.startNewRound();
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
    startGame,
    placeBet,
    lockBets,
    revealCards,
    startNewRound
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
