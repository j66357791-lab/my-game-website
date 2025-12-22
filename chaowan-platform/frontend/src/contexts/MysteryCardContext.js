// frontend/src/contexts/MysteryCardContext.js
import { createContext, useContext, useState } from 'react';
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
    isConnected: false
  });

  const placeBet = (general, amount) => {
    setGameState(prev => ({
      ...prev,
      totalBets: prev.totalBets + amount,
      userBets: [...prev.userBets, { general, amount, timestamp: Date.now() }]
    }));
  };

  const startNewRound = () => {
    setGameState(prev => ({
      ...prev,
      currentPhase: GAME_PHASES.PREPARE,
      timeRemaining: GAME_CONFIG.INITIAL_TIME,
      roundNumber: prev.roundNumber + 1,
      lordCard: null,
      generalsCards: { east: null, south: null, west: null, north: null },
      totalBets: 0,
      userBets: []
    }));
  };

  const lockBets = () => {
    setGameState(prev => ({ ...prev, currentPhase: GAME_PHASES.LOCKING }));
  };

  const revealCards = () => {
    const generateRandomCard = () => Math.floor(Math.random() * 13) + 1;
    setGameState(prev => ({
      ...prev,
      currentPhase: GAME_PHASES.REVEALING,
      lordCard: generateRandomCard(),
      generalsCards: {
        east: generateRandomCard(),
        south: generateRandomCard(),
        west: generateRandomCard(),
        north: generateRandomCard()
      }
    }));
  };

  const settleRound = () => {
    setGameState(prev => ({ ...prev, currentPhase: GAME_PHASES.SETTLEMENT }));
  };

  return (
    <MysteryCardContext.Provider value={{ 
      gameState, 
      placeBet, 
      startNewRound,
      lockBets,
      revealCards,
      settleRound
    }}>
      {children}
    </MysteryCardContext.Provider>
  );
};

export const useMysteryCard = () => useContext(MysteryCardContext);
