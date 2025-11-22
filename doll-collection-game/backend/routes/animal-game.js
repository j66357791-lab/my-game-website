const express = require('express');
const router = express.Router();
const { GameRound, GameStats } = require('../models/AnimalGame');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

router.get('/current-round', async (req, res) => {
    try {
        const currentRound = await GameRound.findOne({ status: 'active' })
            .populate('rooms.players.userId', 'username avatar')
            .lean();
        
        if (!currentRound) {
            return res.json({ 
                message: '等待游戏开始...',
                rooms: ['草丛地', '灌木丛', '森林', '湖泊', '洞穴'].map(name => ({
                    roomName: name,
                    players: [],
                    totalBet: 0
                }))
            });
        }
        
        // 过滤无效数据
        currentRound.rooms = currentRound.rooms.map(room => {
            const validPlayers = room.players.filter(player => {
                return player.userId && player.betAmount > 0;
            });
            
            return {
                ...room,
                players: validPlayers,
                totalBet: validPlayers.reduce((sum, player) => sum + player.betAmount, 0)
            };
        });
        
        // 重新计算总数据
        currentRound.totalPlayers = currentRound.rooms.reduce((sum, room) => sum + room.players.length, 0);
        currentRound.totalBetPool = currentRound.rooms.reduce((sum, room) => sum + room.totalBet, 0);
        
        console.log('🔄 当前轮次数据:', {
            roundNumber: currentRound.roundNumber,
            rooms: currentRound.rooms.map(room => ({
                roomName: room.roomName,
                playerCount: room.players.length,
                totalBet: room.totalBet
            }))
        });
        
        res.json(currentRound);
    } catch (error) {
        console.error('获取当前轮次错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

router.post('/bet', async (req, res) => {
    try {
        const { userId, roomName, betAmount } = req.body;
        
        if (!userId || !roomName || !betAmount || betAmount <= 0) {
            return res.status(400).json({ error: '参数无效' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        if (user.points < betAmount) {
            return res.status(400).json({ error: '积分不足' });
        }
        
        // 使用事务确保数据一致性
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            let currentRound = await GameRound.findOne({ status: 'active' }).session(session);
            
            if (!currentRound) {
                await session.abortTransaction();
                return res.status(400).json({ error: '游戏未开始' });
            }
            
            // 检查是否已经投注
            let existingBet = null;
            for (const room of currentRound.rooms) {
                const playerIndex = room.players.findIndex(p => 
                    p.userId && (p.userId.toString() === userId || 
                    (p.userId._id && p.userId._id.toString() === userId))
                );
                if (playerIndex !== -1) {
                    existingBet = { room, playerIndex };
                    break;
                }
            }
            
            // 如果已有投注，先退还
            if (existingBet) {
                user.points += existingBet.room.players[existingBet.playerIndex].betAmount;
                existingBet.room.totalBet -= existingBet.room.players[existingBet.playerIndex].betAmount;
                existingBet.room.players.splice(existingBet.playerIndex, 1);
            }
            
            // 扣除新投注
            user.points -= betAmount;
            await user.save({ session });
            
            // 记录交易
            await Transaction.create([{
                userId,
                type: 'game_bet',
                amount: -betAmount,
                description: `动物大冒险投注 - ${roomName}`,
                timestamp: new Date()
            }], { session });
            
            const targetRoom = currentRound.rooms.find(r => r.roomName === roomName);
            if (!targetRoom) {
                await session.abortTransaction();
                return res.status(400).json({ error: '房间不存在' });
            }
            
            // 清理该房间的无效玩家数据
            targetRoom.players = targetRoom.players.filter(player => {
                return player.userId && player.betAmount > 0;
            });
            
            targetRoom.players.push({
                userId,
                betAmount,
                joinTime: new Date()
            });
            
            // 重新计算房间总投注
            targetRoom.totalBet = targetRoom.players.reduce((sum, player) => sum + player.betAmount, 0);
            
            // 更新总统计
            currentRound.totalPlayers = currentRound.rooms.reduce((sum, room) => sum + room.players.length, 0);
            currentRound.totalBetPool = currentRound.rooms.reduce((sum, room) => sum + room.totalBet, 0);
            
            await currentRound.save({ session });
            
            // 更新用户统计
            await GameStats.findOneAndUpdate(
                { userId },
                { 
                    $inc: { totalGames: 1, totalBet: betAmount },
                    $set: { lastPlayed: new Date() }
                },
                { upsert: true, new: true, session }
            );
            
            await session.commitTransaction();
            
            // 重新获取完整的轮次数据
            currentRound = await GameRound.findById(currentRound._id)
                .populate('rooms.players.userId', 'username avatar')
                .lean();
            
            // 过滤无效数据后再广播
            currentRound.rooms = currentRound.rooms.map(room => {
                const validPlayers = room.players.filter(player => {
                    return player.userId && player.betAmount > 0;
                });
                
                return {
                    ...room,
                    players: validPlayers,
                    totalBet: validPlayers.reduce((sum, player) => sum + player.betAmount, 0)
                };
            });
            
            console.log('📍 投注成功后广播数据:', {
                roundNumber: currentRound.roundNumber,
                rooms: currentRound.rooms.map(room => ({
                    roomName: room.roomName,
                    playerCount: room.players.length,
                    totalBet: room.totalBet
                }))
            });
            
            if (global.io) {
                global.io.emit('gameUpdate', currentRound);
            }
            
            res.json({ 
                success: true, 
                message: '投注成功',
                balance: user.points,
                round: currentRound
            });
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
        
    } catch (error) {
        console.error('投注错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

router.get('/stats/:userId', async (req, res) => {
    try {
        const stats = await GameStats.findOne({ userId: req.params.userId })
            .lean();
        
        if (!stats) {
            return res.json({
                totalGames: 0,
                wins: 0,
                losses: 0,
                totalBet: 0,
                totalWon: 0,
                candies: 0,
                winRate: 0
            });
        }
        
        const totalGames = (stats.wins || 0) + (stats.losses || 0);
        const winRate = totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(2) : 0;
        
        console.log('📊 用户统计数据:', {
            userId: req.params.userId,
            totalGames,
            wins: stats.wins,
            losses: stats.losses,
            winRate
        });
        
        res.json({
            totalGames: totalGames,
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            totalBet: stats.totalBet || 0,
            totalWon: stats.totalWon || 0,
            candies: parseFloat((stats.candies || 0).toFixed(2)),
            winRate: parseFloat(winRate)
        });
    } catch (error) {
        console.error('获取统计错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const history = await GameRound.find({ status: 'finished' })
            .sort({ roundNumber: -1 })
            .limit(parseInt(limit))
            .select('roundNumber targets hunterTarget isRageMode endTime totalPlayers totalBetPool')
            .lean();
        
        const processedHistory = history.map(round => {
            const targets = round.targets || round.hunterTarget || [];
            return {
                ...round,
                targets: targets.length > 0 ? targets : ['未知房间']
            };
        });
        
        console.log('📜 历史记录数据:', processedHistory.map(h => ({
            roundNumber: h.roundNumber,
            targets: h.targets,
            isRageMode: h.isRageMode
        })));
        
        res.json(processedHistory);
    } catch (error) {
        console.error('获取历史错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;
