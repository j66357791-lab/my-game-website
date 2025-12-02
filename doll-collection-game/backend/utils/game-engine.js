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
        
        await this.startNewRound();
    }

    async startNewRound() {
        try {
            if (this.roundTimeout) {
                clearTimeout(this.roundTimeout);
            }

            // 清理之前的活跃轮次
            await GameRound.updateMany(
                { status: 'active' },
                { $set: { status: 'finished' } }
            );

            const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });
            const roundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

            this.currentRound = new GameRound({
                roundNumber,
                startTime: new Date(),
                endTime: new Date(Date.now() + 40000),
                rooms: this.rooms.map(name => ({
                    roomName: name,
                    players: [],
                    totalBet: 0
                })),
                status: 'active'
            });

            await this.currentRound.save();
            
            console.log(`🎯 第 ${roundNumber} 轮游戏开始`);
            
            this.io.emit('newRound', {
                roundNumber,
                startTime: this.currentRound.startTime,
                endTime: this.currentRound.endTime,
                rooms: this.currentRound.rooms
            });

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
            
            // 获取最新数据
            const freshRound = await GameRound.findById(this.currentRound._id)
                .populate('rooms.players.userId', 'username avatar');
            
            if (!freshRound) {
                console.error('❌ 无法获取轮次数据');
                return;
            }
            
            this.currentRound = freshRound;
            
            // 清理无效数据
            this.currentRound.rooms = this.currentRound.rooms.map(room => {
                const validPlayers = room.players.filter(player => {
                    return player.userId && player.betAmount > 0;
                });
                
                return {
                    ...room.toObject(),
                    players: validPlayers,
                    totalBet: validPlayers.reduce((sum, player) => sum + player.betAmount, 0)
                };
            });
            
            // 重新计算总数据
            this.currentRound.totalPlayers = this.currentRound.rooms.reduce((sum, room) => sum + room.players.length, 0);
            this.currentRound.totalBetPool = this.currentRound.rooms.reduce((sum, room) => sum + room.totalBet, 0);
            
            console.log('🧹 清理后的房间数据:', this.currentRound.rooms.map(room => ({
                roomName: room.roomName,
                playerCount: room.players.length,
                totalBet: room.totalBet
            })));
            
            // 如果没有玩家参与，直接结束
            if (this.currentRound.totalPlayers === 0) {
                console.log('📭 本轮无玩家参与，直接结束');
                this.currentRound.status = 'finished';
                await this.currentRound.save();
                setTimeout(() => this.startNewRound(), 3000);
                return;
            }
            
            // 随机选择目标房间
            const isRageMode = Math.random() < 0.05;
            const targetCount = isRageMode ? Math.floor(Math.random() * 4) + 1 : 1;
            
            const targets = [];
            const availableRooms = [...this.currentRound.rooms];
            
            for (let i = 0; i < Math.min(targetCount, availableRooms.length); i++) {
                const randomIndex = Math.floor(Math.random() * availableRooms.length);
                targets.push(availableRooms[randomIndex].roomName);
                availableRooms.splice(randomIndex, 1);
            }

            if (targets.length === 0 && this.currentRound.rooms.length > 0) {
                const randomRoom = this.currentRound.rooms[Math.floor(Math.random() * this.currentRound.rooms.length)];
                targets.push(randomRoom.roomName);
            }

            console.log(`🎯 猎人选择目标: ${targets.join('、')} ${isRageMode ? '(暴走模式)' : ''}`);

            const results = await this.calculateResults(targets);
            
            // 保存轮次结果
            this.currentRound.targets = targets;
            this.currentRound.hunterTarget = targets;
            this.currentRound.isRageMode = isRageMode;
            this.currentRound.status = 'finished';
            this.currentRound.fee = results.fee;
            this.currentRound.candiesDistributed = results.candiesDistributed;
            
            await this.currentRound.save();

            this.io.emit('roundEnd', {
                round: this.currentRound,
                targets,
                isRageMode,
                results
            });

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
        
        // 简化：奖金池 = 失败者总投注
        const prizePool = totalLoserBet;
        
        // 简化：糖果 = 失败者总投注 / 100
        const totalCandies = Math.floor(totalLoserBet / 100);
        
        console.log(`📊 本轮结果: 失败者投注=${totalLoserBet}, 幸存者投注=${totalWinnerBet}, 奖金池=${prizePool}, 总糖果=${totalCandies}`);
        
        const winnerResults = [];
        const loserResults = [];
        
        // 处理失败者
        for (const room of loserRooms) {
            for (const player of room.players) {
                const candyShare = totalLoserBet > 0 ? 
                    Math.floor((player.betAmount / totalLoserBet) * totalCandies) : 0;
                
                console.log(`💔 失败者 ${player.userId}: 失去${player.betAmount}积分, 获得${candyShare}个糖果`);
                
                // 更新统计
                await GameStats.findOneAndUpdate(
                    { userId: player.userId },
                    { 
                        $inc: { 
                            losses: 1,
                            candies: candyShare
                        }
                    },
                    { upsert: true }
                );
                
                loserResults.push({
                    userId: player.userId,
                    betAmount: player.betAmount,
                    candyShare: candyShare
                });
            }
        }
        
        // 处理幸存者 - 简化版本
        if (totalWinnerBet > 0 && prizePool > 0) {
            for (const room of winnerRooms) {
                for (const player of room.players) {
                    try {
                        const userId = player.userId._id ? player.userId._id : player.userId;
                        const userIdStr = userId.toString();
                        
                        // 简化计算：
                        // 1. 返还本金
                        // 2. 按比例瓜分奖金池
                        // 3. 扣除5%手续费
                        const principalReturn = player.betAmount;
                        const prizeShare = Math.floor((player.betAmount / totalWinnerBet) * prizePool);
                        const totalShouldReceive = principalReturn + prizeShare;
                        const fee = Math.floor(totalShouldReceive * 0.05);
                        const actualReceive = totalShouldReceive - fee;
                        
                        console.log(`🎉 幸存者 ${userIdStr}: 本金${principalReturn}+奖金${prizeShare}-手续费${fee}=实际获得${actualReceive}`);
                        
                        // 直接更新用户积分（不使用事务）
                        const user = await User.findById(userIdStr);
                        if (user) {
                            user.points += actualReceive;
                            await user.save();
                            
                            console.log(`✅ 积分更新成功: ${userIdStr} 新积分 ${user.points}`);
                        }
                        
                        // 记录交易
                        await Transaction.create({
                            userId: userIdStr,
                            type: 'game_win',
                            amount: actualReceive,
                            description: `动物大冒险获胜 - 第${this.currentRound.roundNumber}轮`,
                            timestamp: new Date()
                        });
                        
                        // 更新统计
                        await GameStats.findOneAndUpdate(
                            { userId: userIdStr },
                            { 
                                $inc: { 
                                    wins: 1,
                                    totalWon: prizeShare
                                }
                            },
                            { upsert: true }
                        );
                        
                        winnerResults.push({
                            userId: userIdStr,
                            username: player.userId.username,
                            betAmount: player.betAmount,
                            principalReturn,
                            prizeShare,
                            fee,
                            actualReceive
                        });
                        
                    } catch (error) {
                        console.error(`❌ 处理幸存者 ${player.userId} 时出错:`, error);
                    }
                }
            }
        }
        
        const totalFee = winnerResults.reduce((sum, result) => sum + (result.fee || 0), 0);
        
        console.log(`🎉 积分返还完成，总手续费: ${totalFee}`);
        
        return {
            totalLoserBet,
            totalWinnerBet,
            prizePool,
            fee: totalFee,
            candiesDistributed: totalCandies,
            loserCount: loserRooms.reduce((sum, room) => sum + room.players.length, 0),
            winnerCount: winnerRooms.reduce((sum, room) => sum + room.players.length, 0),
            winnerResults,
            loserResults
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
