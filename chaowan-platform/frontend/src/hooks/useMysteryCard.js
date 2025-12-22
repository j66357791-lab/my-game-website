// frontend/src/hooks/useMysteryCard.js
import { useState, useEffect, useCallback } from 'react';
import { MysteryCardContext } from '../contexts/MysteryCardContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';

export const useMysteryCard = () => {
  const { gameState, placeBet, startNewRound } = useMysteryCard();
  const [localGameState, setLocalGameState] = useState(gameState);

  useEffect(() => {
    setLocalGameState(gameState);
  }, [gameState]);

  const handlePlaceBet = useCallback((general, amount) => {
    placeBet(general, amount);
  }, [placeBet]);

  const handleStartNewRound = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  return {
    gameState: localGameState,
    placeBet: handlePlaceBet,
    startNewRound: handleStartNewRound
  };
};
