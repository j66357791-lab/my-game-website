class GameLoop {
  constructor(io, game, bets) {
    this.io = io
    this.game = game
    this.bets = bets
    this.timer = null
    this.isRunning = false
  }

  start() {
    console.log('🎮 gameLoop.start() 被调用')
    console.log('🎮 当前 isRunning:', this.isRunning)
    
    if (this.isRunning) {
      console.log('⚠️ 游戏已在运行中，当前状态:', this.game.getGameState())
      return
    }
    
    this.isRunning = true
    console.log('🎮 开始新一轮游戏')
    
    // 开始新轮次
    const newRound = this.game.startNewRound()
    console.log('📋 新轮次信息:', newRound)
    console.log('📋 游戏状态:', this.game.getGameState())
    
    // 立即广播游戏状态
    this.broadcastGameState()
    
    // 开始倒计时
    this.startCountdown()
  }

  startCountdown() {
    let seconds = 40
    
    console.log('⏱️ 开始倒计时:', seconds, '秒')
    
    // 清除之前的定时器
    if (this.timer) {
      clearInterval(this.timer)
    }
    
    this.timer = setInterval(() => {
      seconds--
      const timeLeft = this.game.updateTimer()
      
      console.log(`⏰ 倒计时: ${timeLeft}秒`)
      
      // 最后3秒禁止更换房间
      if (seconds === 3) {
        console.log('🔒 投注锁定，禁止更换房间')
        this.io.emit('betting-locked')
      }
      
      // 每秒广播状态
      this.broadcastGameState()
      
      if (timeLeft <= 0) {
        clearInterval(this.timer)
        this.endBettingPhase()
      }
    }, 1000)
  }

  endBettingPhase() {
    console.log('⏰ 投注时间结束，开始狩猎')
    
    // 开始狩猎阶段
    const huntingState = this.game.startHunting()
    console.log('🎯 狩猎状态:', huntingState)
    this.broadcastGameState()
    
    // 3秒后公布结果
    setTimeout(() => {
      this.announceResults()
    }, 3000)
  }

  announceResults() {
    console.log('📢 公布本轮结果')
    
    // 结束本轮
    const resultState = this.game.finishRound()
    console.log('🏁 结果状态:', resultState)
    this.broadcastGameState()
    
    // 计算奖励
    this.calculateRewards()
    
    // 5秒后开始新一轮
    setTimeout(() => {
      this.prepareNextRound()
    }, 5000)
  }

  calculateRewards() {
    const round = this.game.currentRound
    const bets = this.bets.getRoundBets(round)
    
    console.log('💰 计算奖励 - 轮次:', round, '投注数:', bets.size)
    
    if (this.game.isRageMode) {
      // 狂暴模式：所有不在袭击房间的玩家获胜
      this.calculateRageModeRewards(bets)
    } else {
      // 普通模式：所有不在猎人房间的玩家获胜
      this.calculateNormalRewards(bets)
    }
  }

  calculateNormalRewards(bets) {
    const hunterRoom = this.game.hunterRoom
    const winners = []
    const losers = []
    
    for (const [userId, bet] of bets) {
      if (bet.roomId !== hunterRoom) {
        winners.push({ userId, amount: bet.amount, roomId: bet.roomId })
      } else {
        losers.push({ userId, amount: bet.amount, roomId: bet.roomId })
      }
    }
    
    console.log(`🏆 普通模式 - 胜者:${winners.length}人, 败者:${losers.length}人, 猎人房间:${hunterRoom}`)
    this.distributeRewards(winners, losers, 'normal')
  }

  calculateRageModeRewards(bets) {
    const attackedRooms = this.game.attackedRooms
    const winners = []
    const losers = []
    
    for (const [userId, bet] of bets) {
      if (!attackedRooms.includes(bet.roomId)) {
        winners.push({ userId, amount: bet.amount, roomId: bet.roomId })
      } else {
        losers.push({ userId, amount: bet.amount, roomId: bet.roomId })
      }
    }
    
    console.log(`🔥 狂暴模式 - 胜者:${winners.length}人, 败者:${losers.length}人, 袭击房间:${attackedRooms.join(', ')}`)
    this.distributeRewards(winners, losers, 'rage')
  }

  distributeRewards(winners, losers, mode) {
    // 计算总奖池
    const totalPool = winners.reduce((sum, w) => sum + w.amount, 0) + 
                      losers.reduce((sum, l) => sum + l.amount, 0)
    
    if (totalPool === 0) {
      console.log('💸 没有投注，跳过奖励计算')
      return
    }
    
    // 系统抽成5%
    const systemFee = totalPool * 0.05
    const rewardPool = totalPool - systemFee
    
    // 计算每个胜者的奖励
    const totalWinnerBets = winners.reduce((sum, w) => sum + w.amount, 0)
    
    const rewards = []
    
    for (const winner of winners) {
      const reward = (winner.amount / totalWinnerBets) * rewardPool
      rewards.push({
        userId: winner.userId,
        amount: winner.amount,
        reward: reward,
        roomId: winner.roomId,
        profit: reward - winner.amount
      })
    }
    
    // 发放糖果给失败者
    const candyCount = Math.floor(totalPool / 100)
    const candies = []
    
    for (const loser of losers) {
      const candyRatio = loser.amount / losers.reduce((sum, l) => sum + l.amount, 0)
      const candiesForLoser = Math.floor(candyCount * candyRatio)
      candies.push({
        userId: loser.userId,
        amount: loser.amount,
        candies: candiesForLoser,
        roomId: loser.roomId
      })
    }
    
    // 广播奖励结果
    this.io.emit('rewards-announced', {
      mode,
      winners: rewards,
      losers: candies,
      totalPool,
      systemFee,
      rewardPool,
      hunterRoom: this.game.hunterRoom,
      attackedRooms: this.game.attackedRooms
    })
    
    console.log(`💰 奖励发放完成 - 胜者:${winners.length}人, 败者:${losers.length}人, 奖池:${rewardPool.toFixed(2)}`)
  }

  prepareNextRound() {
    console.log('🔄 准备下一轮')
    
    // 清除本轮投注
    this.bets.clearRoundBets(this.game.currentRound)
    
    // 3秒后开始新一轮
    setTimeout(() => {
      this.start()
    }, 3000)
  }

  broadcastGameState() {
    const gameState = this.game.getGameState()
    console.log('📡 广播游戏状态:', gameState)
    this.io.emit('game-state', gameState)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isRunning = false
    console.log('⏹️ 游戏循环已停止')
  }

  // 处理玩家投注
  handleBet(socket, data) {
    const { userId, roomId, amount } = data
    
    console.log('💰 处理投注:', { userId, roomId, amount })
    console.log('🎮 当前游戏状态:', this.game.getGameState())
    
    // 验证投注
    if (this.game.status !== 'betting') {
      console.log('❌ 不在投注时间，当前状态:', this.game.status)
      socket.emit('bet-error', { message: '当前不在投注时间' })
      return
    }
    
    if (this.game.timeLeft <= 3) {
      console.log('❌ 投注时间已结束，剩余时间:', this.game.timeLeft)
      socket.emit('bet-error', { message: '投注时间已结束' })
      return
    }
    
    // 检查房间是否有效
    const validRooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
    if (!validRooms.includes(roomId)) {
      console.log('❌ 无效的房间:', roomId)
      socket.emit('bet-error', { message: '无效的房间' })
      return
    }
    
    // 检查金额
    if (!amount || amount <= 0) {
      console.log('❌ 无效的金额:', amount)
      socket.emit('bet-error', { message: '投注金额必须大于0' })
      return
    }
    
    // 检查是否已有投注
    const existingBet = this.bets.getUserBet(userId)
    if (existingBet && existingBet.round === this.game.currentRound) {
      // 更换房间
      this.bets.changeBet(userId, roomId)
      socket.emit('bet-changed', { roomId, amount })
      console.log(`🔄 玩家${userId}更换房间到${roomId}`)
    } else {
      // 新投注
      this.bets.placeBet(userId, roomId, amount, this.game.currentRound)
      socket.emit('bet-placed', { roomId, amount })
      console.log(`💰 玩家${userId}投注${amount}到${roomId}`)
    }
    
    // 广播投注统计
    const stats = this.bets.getBettingStats(this.game.currentRound)
    this.io.emit('betting-stats', stats)
  }
}

module.exports = GameLoop
