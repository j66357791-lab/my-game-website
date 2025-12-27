// frontend/src/services/gameService.js
import { GAME_PHASES, GAME_CONFIG } from '../utils/gameConstants';

export class GameService {
  constructor() {
    this.gameState = {
      currentPhase: GAME_PHASES.PREPARE,
      timeRemaining: GAME_CONFIG.INITIAL_TIME,
      roundNumber: 1,
      lordCard: null,
      generalsCards: { east: null, south: null, west: null, north: null },
      totalBets: 0,
      userBets: [],
      gameHistory: []
    };
  }

  startNewRound() {
    this.gameState = {
      ...this.gameState,
      currentPhase: GAME_PHASES.PREPARE,
      timeRemaining: GAME_CONFIG.INITIAL_TIME,
      roundNumber: this.gameState.roundNumber + 1,
      lordCard: null,
      generalsCards: { east: null, south: null, west: null, north: null },
      totalBets: 0,
      userBets: []
    };
    return this.gameState;
  }

  placeBet(general, amount) {
    if (this.gameState.currentPhase !== GAME_PHASES.BETTING) {
      throw new Error('Cannot place bet in current phase');
    }

    this.gameState.totalBets += amount;
    this.gameState.userBets.push({ general, amount, timestamp: Date.now() });
    return this.gameState;
  }

  lockBets() {
    if (this.gameState.currentPhase !== GAME_PHASES.BETTING) {
      throw new Error('Cannot lock bets in current phase');
    }

    this.gameState.currentPhase = GAME_PHASES.LOCKING;
    return this.gameState;
  }

  revealCards() {
    if (this.gameState.currentPhase !== GAME_PHASES.LOCKING) {
      throw new Error('Cannot reveal cards in current phase');
    }

    this.gameState.lordCard = generateRandomCard();
    this.gameState.generalsCards = {
      east: generateRandomCard(),
      south: generateRandomCard(),
      west: generateRandomCard(),
      north: generateRandomCard()
    };
    this.gameState.currentPhase = GAME_PHASES.REVEALING;
    return this.gameState;
  }

  settleRound() {
    if (this.gameState.currentPhase !== GAME_PHASES.REVEALING) {
      throw new Error('Cannot settle round in current phase');
    }

    const results = calculateWinner(this.gameState.lordCard, this.gameState.generalsCards);
    this.gameState.gameHistory.push({
      round: this.gameState.roundNumber,
      lordCard: this.gameState.lordCard,
      generalsCards: this.gameState.generalsCards,
      results,
      totalBets: this.gameState.totalBets,
      timestamp: Date.now()
    });
    this.gameState.currentPhase = GAME_PHASES.SETTLEMENT;
    return { ...this.gameState, results };
  }
}

// 辅助函数（需要从gameUtils导入）
function generateRandomCard() {
  // 实现随机卡牌生成逻辑
}

function calculateWinner(lordCard, generalsCards) {
  // 实现胜负计算逻辑
}
