class AdventureGame {
  constructor() {
    this.currentRound = 0
    this.status = 'waiting' // waiting, betting, hunting, finished
    this.timeLeft = 40
    this.hunterRoom = null
    this.isRageMode = false
    this.attackedRooms = []
    this.roundHistory = []
  }

  startNewRound() {
    console.log('🎮 AdventureGame.startNewRound() 被调用')
    
    this.currentRound++
    this.status = 'betting'
    this.timeLeft = 40
    this.hunterRoom = null
    this.isRageMode = Math.random() < 0.05 // 5%概率狂暴模式
    this.attackedRooms = []
    
    console.log(`🎮 开始第${this.currentRound}轮游戏，模式: ${this.isRageMode ? '狂暴' : '普通'}`)
    console.log('🎮 游戏状态更新为:', this.getGameState())
    
    return {
      round: this.currentRound,
      status: this.status,
      timeLeft: this.timeLeft,
      isRageMode: this.isRageMode
    }
  }

  startHunting() {
    console.log('🎯 AdventureGame.startHunting() 被调用')
    
    this.status = 'hunting'
    
    if (this.isRageMode) {
      // 狂暴模式：随机1-4个房间
      const roomCount = Math.floor(Math.random() * 4) + 1
      const rooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
      this.attackedRooms = this.getRandomRooms(rooms, roomCount)
      console.log(`🔥 狂暴模式！袭击房间: ${this.attackedRooms.join(', ')}`)
    } else {
      // 普通模式：1个房间
      const rooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
      this.hunterRoom = rooms[Math.floor(Math.random() * 5)]
      console.log(`🎯 普通模式！猎人房间: ${this.hunterRoom}`)
    }
    
    console.log('🎮 狩猎状态:', this.getGameState())
    
    return {
      status: this.status,
      hunterRoom: this.hunterRoom,
      attackedRooms: this.attackedRooms,
      isRageMode: this.isRageMode
    }
  }

  finishRound() {
    console.log('🏁 AdventureGame.finishRound() 被调用')
    
    this.status = 'finished'
    
    // 记录本轮历史
    this.roundHistory.push({
      round: this.currentRound,
      hunterRoom: this.hunterRoom,
      attackedRooms: this.attackedRooms,
      isRageMode: this.isRageMode,
      timestamp: new Date()
    })
    
    // 只保留最近10轮历史
    if (this.roundHistory.length > 10) {
      this.roundHistory = this.roundHistory.slice(-10)
    }
    
    console.log(`🏁 第${this.currentRound}轮游戏结束`)
    console.log('🎮 结束状态:', this.getGameState())
    
    return {
      status: this.status,
      round: this.currentRound,
      hunterRoom: this.hunterRoom,
      attackedRooms: this.attackedRooms,
      isRageMode: this.isRageMode
    }
  }

  getRandomRooms(rooms, count) {
    const shuffled = [...rooms].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  updateTimer() {
    if (this.timeLeft > 0) {
      this.timeLeft--
      return this.timeLeft
    }
    return 0
  }

  getGameState() {
    return {
      round: this.currentRound,
      status: this.status,
      timeLeft: this.timeLeft,
      hunterRoom: this.hunterRoom,
      attackedRooms: this.attackedRooms,
      isRageMode: this.isRageMode,
      roundHistory: this.roundHistory
    }
  }
}

module.exports = AdventureGame
