class AdventureBet {
  constructor() {
    this.bets = new Map() // userId -> { roomId, amount, timestamp }
    this.roundBets = new Map() // round -> Map(userId -> bet)
  }

  placeBet(userId, roomId, amount, round) {
    const bet = {
      roomId,
      amount,
      timestamp: Date.now(),
      round
    }
    
    this.bets.set(userId, bet)
    
    // 按轮次记录
    if (!this.roundBets.has(round)) {
      this.roundBets.set(round, new Map())
    }
    this.roundBets.get(round).set(userId, bet)
    
    console.log(`💰 记录投注: 用户${userId} -> ${roomId}, 金额:${amount}, 轮次:${round}`)
    
    return bet
  }

  changeBet(userId, newRoomId) {
    const bet = this.bets.get(userId)
    if (bet) {
      const oldRoomId = bet.roomId
      bet.roomId = newRoomId
      bet.timestamp = Date.now()
      
      // 更新轮次记录
      const roundBets = this.roundBets.get(bet.round)
      if (roundBets && roundBets.has(userId)) {
        roundBets.get(userId).roomId = newRoomId
        roundBets.get(userId).timestamp = Date.now()
      }
      
      console.log(`🔄 更换投注: 用户${userId} 从${oldRoomId} -> ${newRoomId}`)
      
      return { oldRoomId, newRoomId }
    }
    return null
  }

  getBetsByRoom(roomId, round = null) {
    const result = []
    const betsToCheck = round ? 
      (this.roundBets.get(round) || new Map()) : 
      this.bets
    
    for (const [userId, bet] of betsToCheck) {
      if (bet.roomId === roomId) {
        result.push({ userId, amount: bet.amount, timestamp: bet.timestamp })
      }
    }
    return result
  }

  getUserBet(userId) {
    return this.bets.get(userId)
  }

  getRoundBets(round) {
    return this.roundBets.get(round) || new Map()
  }

  clearRoundBets(round) {
    // 清除指定轮次的投注
    const roundBets = this.roundBets.get(round)
    if (roundBets) {
      for (const [userId, bet] of roundBets) {
        this.bets.delete(userId)
      }
      this.roundBets.delete(round)
      console.log(`🧹 清除第${round}轮投注，共${roundBets.size}条`)
    }
  }

  clearAllBets() {
    this.bets.clear()
    this.roundBets.clear()
    console.log('🧹 清除所有投注')
  }

  getBettingStats(round = null) {
    const betsToCheck = round ? 
      (this.roundBets.get(round) || new Map()) : 
      this.bets
    
    const stats = {
      totalBets: 0,
      totalAmount: 0,
      roomStats: {}
    }
    
    const rooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
    rooms.forEach(room => {
      stats.roomStats[room] = { count: 0, amount: 0 }
    })
    
    for (const [userId, bet] of betsToCheck) {
      stats.totalBets++
      stats.totalAmount += bet.amount
      stats.roomStats[bet.roomId].count++
      stats.roomStats[bet.roomId].amount += bet.amount
    }
    
    return stats
  }
}

module.exports = AdventureBet
