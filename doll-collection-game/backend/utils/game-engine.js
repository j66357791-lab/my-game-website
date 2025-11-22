const { GameRound, GameStats } = require('../models/AnimalGame');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class AnimalGameEngine {
    constructor(io) {
        this.io = io;
        this.rooms = ['草丛地', '灌木丛', '森林', '湖泊', '洞穴'];
        this.currentRound = null;
        this.roundTimeout = null;
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🎮 动物大冒险游戏引擎启动');
        
        // 立即开始第一轮
        await this.startNewRound();
    }

    async startNewRound() {
        try {
            // 清除之前的定时器
            if (this.roundTimeout) {
                clearTimeout(this.roundTimeout);
            }

            // 结束上一轮（如果还在进行）
            if (this.currentRound && this.currentRound.status === 'active') {
                await this.endRound();
            }

            // 获取下一轮编号
            const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });
            const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

            // 创建新轮次
            this.currentRound = new GameRound({
                roundNumber,
                startTime: new Date(),
                endTime: new Date(Date.now() + 40000), // 40秒
                rooms: this.rooms.map(name => ({
                    roomName: name,
                    players: [],
                    totalBet: 0
                })),
                status: 'active'
            });

            await this.currentRound.save();
            
            console.log(`🎯 第 ${roundNumber} 轮游戏开始`);
            
            // 广播新轮次开始
            this.io.emit('newRound', {
                roundNumber,
                startTime: this.currentRound.startTime,
                endTime: this.currentRound.endTime,
                rooms: this.currentRound.rooms
            });

            // 40秒后自动结束
            this.roundTimeout = setTimeout(() => {
                this.endRound();
            }, 40000);
            
        } catch (error) {
            console.error('开始新轮次错误:', error);
        }
    }

    async endRound() {
        if (!this.currentRound || this.currentRound.status !== 'active') return;

        try {
            console.log(`🏁 第 ${this.currentRound.roundNumber} 轮游戏结束`);
            
            // 修复：猎人必须袭击至少一个房间
            const isRageMode = Math.random() < 0.05; // 5%概率狂暴模式
            const targetCount = isRageMode ? 
                Math.floor(Math.random() * 4) + 1 : 1; // 狂暴模式1-4个房间，普通模式1个
            
            // 获取所有房间（不管是否有玩家）
            const allRooms = this.currentRound.rooms;
            
            // 修复：必须选择目标房间，即使没有玩家
            const targets = [];
            const availableRooms = [...allRooms];
            
            for (let i = 0; i < Math.min(targetCount, availableRooms.length); i++) {
                const randomIndex = Math.floor(Math.random() * availableRooms.length);
                targets.push(availableRooms[randomIndex].roomName);
                availableRooms.splice(randomIndex, 1);
            }

            // 如果没有房间（理论上不可能），强制选择一个
            if (targets.length === 0 && allRooms.length > 0) {
                const randomRoom = allRooms[Math.floor(Math.random() * allRooms.length)];
                targets.push(randomRoom.roomName);
            }

            // 计算结果
            const results = await this.calculateResults(targets);
            
            // 更新游戏状态
            this.currentRound.hunterTarget = targets;
            this.currentRound.isRageMode = isRageMode;
            this.currentRound.status = 'finished';
            this.currentRound.fee = results.fee;
            this.currentRound.candiesDistributed = results.candiesToDistribute;
            
            await this.currentRound.save();

            // 广播结果
            this.io.emit('roundEnd', {
                round: this.currentRound,
                targets,
                isRageMode,
                results
            });

            // 3秒后开始新轮次
            setTimeout(() => this.startNewRound(), 3000);
            
        } catch (error) {
            console.error('结束轮次错误:', error);
        }
    }

    async calculateResults(targets) {
        const loserRooms = this.currentRound.rooms.filter(room => targets.includes(room.roomName));
        const winnerRooms = this.currentRound.rooms.filter(room => !targets.includes(room.roomName));
        
        const totalLoserBet = loserRooms.reduce((sum, room) => sum + room.totalBet, 0);
        const totalWinnerBet = winnerRooms.reduce((sum, room) => sum + room.totalBet, 0);
        
        const fee = Math.floor(totalLoserBet * 0.05); // 5%手续费
        const prizePool = totalLoserBet - fee;
        
        // 计算糖果数量
        const candiesToDistribute = Math.floor(totalLoserBet / 100);
        
        // 处理失败者
        for (const room of loserRooms) {
            for (const player of room.players) {
                // 按比例分配糖果
                const candyShare = totalLoserBet > 0 ? 
                    Math.floor((player.betAmount / totalLoserBet) * candiesToDistribute) : 0;
                
                await GameStats.findOneAndUpdate(
                    { userId: player.userId },
                    { 
                        $inc: { 
                            losses: 1,
                            candies: candyShare
                        }
                    }
                );
            }
        }
        
        // 处理幸存者
        if (totalWinnerBet > 0 && prizePool > 0) {
            for (const room of winnerRooms) {
                for (const player of room.players) {
                    // 计算奖金份额
                    const prizeShare = Math.floor((player.betAmount / totalWinnerBet) * prizePool);
                    const totalReturn = player.betAmount + prizeShare;
                    
                    // 更新用户积分
                    await User.findByIdAndUpdate(
                        player.userId,
                        { $inc: { points: totalReturn } }
                    );
                    
                    // 记录交易
                    await Transaction.create({
                        userId: player.userId,
                        type: 'game_win',
                        amount: totalReturn,
                        description: `动物大冒险获胜 - 第${this.currentRound.roundNumber}轮`,
                        timestamp: new Date()
                    });
                    
                    // 更新统计
                    await GameStats.findOneAndUpdate(
                        { userId: player.userId },
                        { 
                            $inc: { 
                                wins: 1,
                                totalWon: prizeShare
                            }
                        }
                    );
                }
            }
        }
        
        return {
            totalLoserBet,
            totalWinnerBet,
            prizePool,
            fee,
            candiesToDistribute,
            loserCount: loserRooms.reduce((sum, room) => sum + room.players.length, 0),
            winnerCount: winnerRooms.reduce((sum, room) => sum + room.players.length, 0)
        };
    }

    stop() {
        this.isRunning = false;
        if (this.roundTimeout) {
            clearTimeout(this.roundTimeout);
        }
        console.log('🛑 动物大冒险游戏引擎停止');
    }
}

module.exports = AnimalGameEngine;
