// frontend/src/utils/gameConstants.js
export const GAME_PHASES = {
  PREPARE: 'PREPARE',
  BETTING: 'BETTING',
  LOCKING: 'LOCKING',
  REVEALING: 'REVEALING',
  SETTLEMENT: 'SETTLEMENT'
};

export const CARD_SUITS = {
  HEART: 'heart',
  DIAMOND: 'diamond',
  CLUB: 'club',
  SPADE: 'spade'
};

export const CARD_VALUES = {
  ACE: 'A',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'J',
  QUEEN: 'Q',
  KING: 'K'
};

export const GAME_CONFIG = {
  INITIAL_TIME: 30,
  MIN_BET: 1,
  MAX_BET: 1000,
  MAX_ROUNDS: 10
};

export const GENERAL_POSITIONS = {
  EAST: 'east',
  SOUTH: 'south',
  WEST: 'west',
  NORTH: 'north'
};
