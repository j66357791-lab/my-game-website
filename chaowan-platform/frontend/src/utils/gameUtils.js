// frontend/src/utils/gameUtils.js
import { GAME_PHASES, CARD_VALUES } from './gameConstants';

export const generateRandomCard = () => {
  const suits = Object.values(CARD_VALUES);
  const randomIndex = Math.floor(Math.random() * suits.length);
  return suits[randomIndex];
};

export const calculateWinner = (lordCard, generalsCards) => {
  const results = {};
  for (const [general, card] of Object.entries(generalsCards)) {
    if (card > lordCard) {
      results[general] = 'win';
    } else if (card === lordCard) {
      results[general] = 'draw';
    } else {
      results[general] = 'lose';
    }
  }
  return results;
};

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getPhaseColor = (phase) => {
  const phaseColors = {
    [GAME_PHASES.PREPARE]: '#e8f4fd',
    [GAME_PHASES.BETTING]: '#fff3cd',
    [GAME_PHASES.LOCKING]: '#fef5e7',
    [GAME_PHASES.REVEALING]: '#d4edda',
    [GAME_PHASES.SETTLEMENT]: '#e8f5e9'
  };
  return phaseColors[phase] || '#f8f9fa';
};
