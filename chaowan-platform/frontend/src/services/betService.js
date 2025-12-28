// frontend/src/services/betService.js
export class BetService {
  constructor() {
    this.bets = [];
  }

  placeBet(general, amount, userId) {
    const bet = {
      id: Date.now(),
      general,
      amount,
      userId,
      timestamp: new Date()
    };
    this.bets.push(bet);
    return bet;
  }

  getUserBets(userId) {
    return this.bets.filter(bet => bet.userId === userId);
  }

  getTotalBets() {
    return this.bets.reduce((total, bet) => total + bet.amount, 0);
  }

  clearBets() {
    this.bets = [];
  }
}
