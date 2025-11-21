const socketIo = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

function initAdventureSocket(server) {
  const io = socketIo(server, {
    path: '/adventure-socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  // JWT密钥
  const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024'

  // 游戏状态
  let gameState = {
    round: 1,
    status: 'waiting',
    timeLeft: 40,
    hunterRoom: null,
    attackedRooms: [],
    isRageMode: false
  }

  // 投注记录
  let roundBets = new Map()
  let countdownTimer = null

  // 广播游戏状态
  function broadcastState() {
    console.log('📡 广播游戏状态:', gameState)
    io.emit('game-update', gameState)
  }

  // 开始倒计时
  function startCountdown() {
    console.log('⏰ 开始倒计时')
    
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }
    
    countdownTimer = setInterval(() => {
      gameState.timeLeft--
      
      console.log(`⏱️ 倒计时: ${gameState.timeLeft}秒`)
      
      if (gameState.timeLeft === 3) {
        io.emit('betting-locked')
      }
      
      broadcastState()
      
      if (gameState.timeLeft <= 0) {
        clearInterval(countdownTimer)
        endRound()
      }
    }, 1000)
  }

  // 结束轮次
  function endRound() {
    console.log('🏁 轮次结束')
    
    gameState.status = 'hunting'
    
    const rooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
    gameState.isRageMode = Math.random() < 0.1
    
    if (gameState.isRageMode) {
      const roomCount = Math.floor(Math.random() * 3) + 1
      const shuffled = rooms.sort(() => 0.5 - Math.random())
      gameState.attackedRooms = shuffled.slice(0, roomCount)
      console.log('🔥 狂暴模式！袭击房间:', gameState.attackedRooms)
    } else {
      gameState.hunterRoom = rooms[Math.floor(Math.random() * rooms.length)]
      console.log('🎯 普通模式！猎人房间:', gameState.hunterRoom)
    }
    
    broadcastState()
    
    setTimeout(() => {
      calculateResults()
    }, 3000)
  }

  // 计算结果
  async function calculateResults() {
    console.log('💰 计算本轮结果')
    
    const currentRoundBets = roundBets.get(gameState.round) || new Map()
    const winners = []
    const losers = []
    
    for (const [userId, bet] of currentRoundBets) {
      let isWinner = false
      
      if (gameState.isRageMode) {
        isWinner = !gameState.attackedRooms.includes(bet.roomId)
      } else {
        isWinner = bet.roomId !== gameState.hunterRoom
      }
      
      if (isWinner) {
        winners.push({ userId, ...bet })
      } else {
        losers.push({ userId, ...bet })
      }
    }
    
    console.log(`🏆 结果统计 - 胜者:${winners.length}人, 败者:${losers.length}人`)
    
    await distributeRewards(winners, losers)
    
    setTimeout(() => {
      startNewRound()
    }, 5000)
  }

  // 分发奖励
  async function distributeRewards(winners, losers) {
    const totalPool = winners.reduce((sum, w) => sum + w.amount, 0) + 
                      losers.reduce((sum, l) => sum + l.amount, 0)
    
    if (totalPool === 0) {
      console.log('💸 没有投注，跳过奖励分发')
      io.emit('results-announced', { winners: [], losers: [], totalPool: 0 })
      return
    }
    
    const systemFee = totalPool * 0.05
    const rewardPool = totalPool - systemFee
    
    const totalWinnerBets = winners.reduce((sum, w) => sum + w.amount, 0)
    const winnerResults = []
    
    for (const winner of winners) {
      const reward = (winner.amount / totalWinnerBets) * rewardPool
      const profit = reward - winner.amount
      
      try {
        await User.findByIdAndUpdate(winner.userId, {
          $inc: { points: Math.floor(profit) }
        })
        
        winnerResults.push({
          userId: winner.userId,
          username: winner.username,
          amount: winner.amount,
          reward: Math.floor(reward),
          profit: Math.floor(profit),
          roomId: winner.roomId
        })
      } catch (error) {
        console.error('更新胜者积分失败:', error)
      }
    }
    
    const candyCount = Math.floor(totalPool / 100)
    const loserResults = []
    
    for (const loser of losers) {
      const candyRatio = loser.amount / losers.reduce((sum, l) => sum + l.amount, 0)
      const candies = Math.floor(candyCount * candyRatio)
      
      loserResults.push({
        userId: loser.userId,
        username: loser.username,
        amount: loser.amount,
        candies: candies,
        roomId: loser.roomId
      })
    }
    
    io.emit('results-announced', {
      winners: winnerResults,
      losers: loserResults,
      totalPool,
      systemFee,
      rewardPool,
      hunterRoom: gameState.hunterRoom,
      attackedRooms: gameState.attackedRooms,
      isRageMode: gameState.isRageMode
    })
    
    console.log(`💰 奖励分发完成 - 胜者:${winners.length}人, 败者:${losers.length}人, 奖池:${rewardPool.toFixed(2)}`)
  }

  // 开始新轮次
  function startNewRound() {
    console.log('🔄 开始新轮次')
    
    gameState.round++
    gameState.status = 'betting'
    gameState.timeLeft = 40
    gameState.hunterRoom = null
    gameState.attackedRooms = []
    gameState.isRageMode = false
    
    broadcastState()
    startCountdown()
  }

  // 验证JWT令牌
  async function verifyToken(socket, token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const user = await User.findById(decoded.id)
      
      if (!user) {
        socket.emit('auth-error', { message: '用户不存在' })
        return null
      }
      
      return user
    } catch (error) {
      socket.emit('auth-error', { message: '身份验证失败' })
      return null
    }
  }

  io.on('connection', (socket) => {
    console.log('🎮 玩家连接:', socket.id)
    
    socket.on('login', async (data) => {
      console.log('🔐 收到登录请求:', data.token ? '有token' : '无token')
      
      const user = await verifyToken(socket, data.token)
      if (!user) {
        return
      }
      
      socket.userId = user._id.toString()
      socket.username = user.username
      socket.points = user.points
      
      console.log(`✅ 用户登录成功: ${user.username} (积分: ${user.points})`)
      
      socket.emit('login-success', {
        user: {
          id: user._id,
          username: user.username,
          points: user.points
        },
        gameState: gameState
      })
    })
    
    socket.on('bet', async (data) => {
      console.log('💰 收到投注请求:', data)
      
      if (!socket.userId) {
        socket.emit('bet-error', { message: '请先登录' })
        return
      }
      
      if (gameState.status !== 'betting') {
        socket.emit('bet-error', { message: '当前不在投注时间' })
        return
      }
      
      if (gameState.timeLeft <= 3) {
        socket.emit('bet-error', { message: '投注时间已结束' })
        return
      }
      
      if (!data.amount || data.amount <= 0) {
        socket.emit('bet-error', { message: '投注金额必须大于0' })
        return
      }
      
      if (socket.points < data.amount) {
        socket.emit('bet-error', { message: '积分不足' })
        return
      }
      
      const validRooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴']
      if (!validRooms.includes(data.roomId)) {
        socket.emit('bet-error', { message: '无效的房间' })
        return
      }
      
      try {
        await User.findByIdAndUpdate(socket.userId, {
          $inc: { points: -data.amount }
        })
        
        socket.points -= data.amount
        
        if (!roundBets.has(gameState.round)) {
          roundBets.set(gameState.round, new Map())
        }
        
        roundBets.get(gameState.round).set(socket.userId, {
          roomId: data.roomId,
          amount: data.amount,
          username: socket.username
        })
        
        console.log(`✅ 投注成功: ${socket.username} 投注${data.amount}到${data.roomId}`)
        
        socket.emit('bet-success', {
          roomId: data.roomId,
          amount: data.amount,
          newPoints: socket.points
        })
        
        const currentRoundBets = roundBets.get(gameState.round) || new Map()
        const stats = {
          totalBets: currentRoundBets.size,
          totalAmount: Array.from(currentRoundBets.values()).reduce((sum, bet) => sum + bet.amount, 0)
        }
        
        io.emit('betting-stats', stats)
        
      } catch (error) {
        console.error('投注处理失败:', error)
        socket.emit('bet-error', { message: '投注失败，请重试' })
      }
    })
    
    socket.on('get-points', async () => {
      if (!socket.userId) {
        socket.emit('points-error', { message: '请先登录' })
        return
      }
      
      try {
        const user = await User.findById(socket.userId)
        socket.points = user.points
        socket.emit('points-updated', { points: user.points })
      } catch (error) {
        socket.emit('points-error', { message: '获取积分失败' })
      }
    })
    
    socket.on('start-game', () => {
      console.log('🎯 手动开始游戏')
      if (gameState.status === 'waiting') {
        startNewRound()
      }
    })
    
    socket.on('disconnect', () => {
      console.log('🎮 玩家断开:', socket.id)
    })
  })

  setTimeout(() => {
    console.log('🚀 自动开始第一轮游戏')
    startNewRound()
  }, 5000)

  console.log('✅ 动物大冒险Socket服务已启动')
  return io
}

module.exports = initAdventureSocket
